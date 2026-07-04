import { StreamParser } from '../src/modules/ai/stream-parser';

function runTest() {
  console.log('=== RUNNING STREAM PARSER TESTS ===\n');

  // Test 1: Plain text and coding blocks
  console.log('--- Test 1: Chat and Code Block ---');
  const parser1 = new StreamParser();
  const chunks1 = [
    'Hello user! Here is a simple JS function:\n',
    '```javascript\n',
    'const add = (a, b) => a + b;\n',
    'console.log(add(1, 2));\n',
    '```\n',
    'Hope this helps!'
  ];

  for (let i = 0; i < chunks1.length; i++) {
    const chunk = chunks1[i]!;
    const isLast = i === chunks1.length - 1;
    const events = parser1.feed(chunk, isLast);
    console.log(`Feed chunk: ${JSON.stringify(chunk)}`);
    console.log(`Emitted events:`, JSON.stringify(events, null, 2));
  }

  // Test 2: Product block parsing (buffered then emitted)
  console.log('\n--- Test 2: Product Block (JSON) ---');
  const parser2 = new StreamParser();
  const chunks2 = [
    'Here are the details of the products you requested:\n',
    '```json\n',
    '{\n',
    '  "type": "product",\n',
    '  "data": [\n',
    '    {"id": "p1", "name": "Standard Cue", "price": 49.99},\n',
    '    {"id": "p2", "name": "Premium Cue Case", "price": 29.99}\n',
    '  ]\n',
    '}\n',
    '```\n',
    'Enjoy!'
  ];

  for (let i = 0; i < chunks2.length; i++) {
    const chunk = chunks2[i]!;
    const isLast = i === chunks2.length - 1;
    const events = parser2.feed(chunk, isLast);
    console.log(`Feed chunk: ${JSON.stringify(chunk)}`);
    if (events.length > 0) {
      console.log(`Emitted events:`, JSON.stringify(events, null, 2));
    }
  }

  // Test 3: Map block parsing (buffered then emitted)
  console.log('\n--- Test 3: Map Block (JSON) ---');
  const parser3 = new StreamParser();
  const chunks3 = [
    'The tournament location details:\n',
    '```json\n',
    '{\n',
    '  "type": "map",\n',
    '  "coordinates": {\n',
    '    "lat": 13.7563,\n',
    '    "lng": 100.5018\n',
    '  },\n',
    '  "locationName": "Bangkok, Thailand"\n',
    '}\n',
    '```\n',
    'See you there!'
  ];

  for (let i = 0; i < chunks3.length; i++) {
    const chunk = chunks3[i]!;
    const isLast = i === chunks3.length - 1;
    const events = parser3.feed(chunk, isLast);
    console.log(`Feed chunk: ${JSON.stringify(chunk)}`);
    if (events.length > 0) {
      console.log(`Emitted events:`, JSON.stringify(events, null, 2));
    }
  }
}

runTest();
