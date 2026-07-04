export interface StreamEvent {
  type: 'text' | 'code' | 'product' | 'map';
  content?: string;
  language?: string;
  data?: any;
  coordinates?: { lat: number; lng: number };
  locationName?: string;
}

export class StreamParser {
  private buffer = '';
  private processedIndex = 0;
  private inCodeBlock = false;
  private codeLanguage = '';
  private codeStartIndex = 0;

  /**
   * Feed a new text chunk from the Gemini stream.
   * Returns any fully parsed/structured events from this chunk.
   */
  public feed(chunk: string, isFinished = false): StreamEvent[] {
    this.buffer += chunk;
    const events: StreamEvent[] = [];

    while (true) {
      if (!this.inCodeBlock) {
        // Look for the next opening code block "```"
        const idx = this.buffer.indexOf('```', this.processedIndex);
        if (idx === -1) {
          // No opening block found. We can output everything before the end,
          // keeping a safety margin of 3 characters in case a "```" is being cut off.
          const limit = isFinished ? this.buffer.length : Math.max(this.processedIndex, this.buffer.length - 3);
          if (limit > this.processedIndex) {
            const textContent = this.buffer.substring(this.processedIndex, limit);
            events.push({ type: 'text', content: textContent });
            this.processedIndex = limit;
          }
          break;
        }

        // We found "```" at idx. Output any text before it first.
        if (idx > this.processedIndex) {
          const textContent = this.buffer.substring(this.processedIndex, idx);
          events.push({ type: 'text', content: textContent });
          this.processedIndex = idx;
        }

        // Try to parse the language. We need the newline character after the backticks.
        const newlineIdx = this.buffer.indexOf('\n', idx + 3);
        if (newlineIdx === -1) {
          // Newline not received yet. If the stream is finished, treat the rest as plain text.
          if (isFinished) {
            const textContent = this.buffer.substring(idx);
            if (textContent.length > 0) {
              events.push({ type: 'text', content: textContent });
            }
            this.processedIndex = this.buffer.length;
          }
          // Otherwise, wait for the next chunk to complete the language line.
          break;
        }

        // Parse language
        const language = this.buffer.substring(idx + 3, newlineIdx).trim().toLowerCase();
        this.inCodeBlock = true;
        this.codeLanguage = language || 'text';
        this.codeStartIndex = newlineIdx + 1;
        this.processedIndex = newlineIdx + 1;
      } else {
        // We are in a code block. Look for the closing code block "```"
        const idx = this.buffer.indexOf('```', this.processedIndex);
        if (idx === -1) {
          // No closing block found.
          if (this.codeLanguage !== 'json') {
            // Stream the code content dynamically, keeping a safety margin of 3 characters
            const limit = isFinished ? this.buffer.length : Math.max(this.processedIndex, this.buffer.length - 3);
            if (limit > this.processedIndex) {
              const codeContent = this.buffer.substring(this.processedIndex, limit);
              events.push({ type: 'code', language: this.codeLanguage, content: codeContent });
              this.processedIndex = limit;
            }
          }
          break;
        }

        // Closing block found at idx.
        const codeContent = this.buffer.substring(this.processedIndex, idx);

        if (this.codeLanguage === 'json') {
          // For JSON blocks, we accumulated the entire JSON content from codeStartIndex to idx
          const fullJsonContent = this.buffer.substring(this.codeStartIndex, idx).trim();
          try {
            const parsed = JSON.parse(fullJsonContent);
            if (parsed && typeof parsed === 'object') {
              if (parsed.type === 'product' && Array.isArray(parsed.data)) {
                events.push({
                  type: 'product',
                  data: parsed.data,
                });
              } else if (
                parsed.type === 'map' &&
                parsed.coordinates &&
                typeof parsed.coordinates.lat === 'number' &&
                typeof parsed.coordinates.lng === 'number' &&
                typeof parsed.locationName === 'string'
              ) {
                events.push({
                  type: 'map',
                  coordinates: parsed.coordinates,
                  locationName: parsed.locationName,
                });
              } else {
                // Other JSON structure, emit as JSON code block
                events.push({ type: 'code', language: 'json', content: fullJsonContent });
              }
            } else {
              events.push({ type: 'code', language: 'json', content: fullJsonContent });
            }
          } catch (e) {
            // If parsing fails, emit as code
            events.push({ type: 'code', language: 'json', content: fullJsonContent });
          }
        } else {
          // Send the last piece of code content before closing
          if (codeContent.length > 0) {
            events.push({ type: 'code', language: this.codeLanguage, content: codeContent });
          }
        }

        this.inCodeBlock = false;
        this.processedIndex = idx + 3;
      }
    }

    return events;
  }
}
