import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { StreamParser } from './stream-parser';

interface Message {
  role?: string;
  content?: string;
  parts?: Array<{ text: string }>;
  text?: string;
}

/**
 * Normalizes input prompt or message history to Gemini API format.
 */
function formatContents(prompt?: string, messages?: Message[]): any {
  if (prompt) {
    return prompt;
  }
  if (messages && Array.isArray(messages)) {
    return messages.map(msg => {
      let role = msg.role || 'user';
      if (role === 'assistant') {
        role = 'model';
      }

      let parts = msg.parts;
      if (!parts) {
        const text = msg.content || msg.text || '';
        parts = [{ text }];
      }

      return { role, parts };
    });
  }
  return '';
}

export const playAiPlayground = async (req: Request, res: Response): Promise<void> => {
  // 1. Authentication Check
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    return;
  }

  const { prompt, messages, systemInstruction, model = 'gemini-2.5-flash' } = req.body || {};

  if (!prompt && !messages) {
    res.status(400).json({ error: 'Bad Request: Either prompt or messages is required' });
    return;
  }

  // 2. Set SSE Headers immediately to start streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked',
  });

  const parser = new StreamParser();
  let isDisconnected = false;

  // Listen for client disconnect and toggle flag
  req.on('close', () => {
    isDisconnected = true;
  });

  try {
    // 3. Initialize GoogleGenAI client dynamically with key
    const ai = new GoogleGenAI({ apiKey });

    // Build configuration
    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    } else {
      // Default playground system instruction to support conditional rendering of product and map
      config.systemInstruction = 
        "You are a helpful assistant in an AI Playground. You can output normal prose, programming code blocks (e.g., ```javascript), or special structured blocks. " +
        "If the user asks for a product list, use a ```json code block containing a single object with type 'product' and an array 'data' of products, like this: " +
        "```json\n{\n  \"type\": \"product\",\n  \"data\": [\n    { \"id\": \"p1\", \"name\": \"Cue Stick Classic\", \"price\": 89.99, \"description\": \"High quality maple cue stick\" }\n  ]\n}\n```\n" +
        "If the user asks to show geographical data or a map location, use a ```json code block containing an object with type 'map', coordinates (lat and lng numbers), and locationName string, like this: " +
        "```json\n{\n  \"type\": \"map\",\n  \"coordinates\": { \"lat\": 48.8566, \"lng\": 2.3522 },\n  \"locationName\": \"Paris, France\"\n}\n```";
    }

    const contents = formatContents(prompt, messages);
    console.log("🚀 ~ playAiPlayground ~ contents:", contents)

    // 4. Request streaming content from Gemini
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config,
    });
    console.log("🚀 ~ playAiPlayground ~ responseStream:", responseStream)

    // 5. Read chunks and push back to user
    for await (const chunk of responseStream) {
      console.log("🚀 ~ playAiPlayground ~ chunk:", chunk)
      if (isDisconnected) {
        break;
      }

      const text = chunk.text;
      if (text) {
        const events = parser.feed(text);
        console.log("🚀 ~ playAiPlayground ~ events:", events)
        for (const event of events) {
          if (!isDisconnected) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        }
      }
    }

    // Flush any remaining buffered content if the connection is still open
    if (!isDisconnected) {
      const finalEvents = parser.feed('', true);
      for (const event of finalEvents) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // 6. Push final end signal
      res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    // 7. Error handling
    console.error('Gemini API Streaming Error:', error);
    
    if (!isDisconnected) {
      // Safely send the error event and close response
      const errorMessage = error?.message || 'Internal Server Error during AI streaming';
      res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
      res.end();
    }
  }
};
