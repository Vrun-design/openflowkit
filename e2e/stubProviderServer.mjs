// Local stand-in for every provider so the e2e suite never touches a real API.
// The wire shape follows the path; the key chooses success or a failure mode, and
// on success the last user turn chooses a chat reply ("hi"), a description of
// attached images, or a diagram. On the OpenAI wire with tools, a diagram is
// drawn the agent way — an add_diagram call, then a closing line after the
// tool result:
//   sk-ok → 200 · sk-bad → 401 · sk-model → 404 · sk-ratelimited → 429
//   sk-down → 503 · sk-malformed → 200 non-JSON · anything else → 401
// It sends permissive CORS headers, which is what a browser-ready provider does.
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4399);
const DRAW = 'Here is a start.\n```openflow new\nflowchart\n  Stub -> Works\n```';
const CHAT = 'Hello! I can **explain**, review or draw diagrams. What are we mapping?';

const textOf = (turn) => {
  const content = turn?.content ?? turn?.parts;
  if (typeof content === 'string') return content;
  return Array.isArray(content) ? content.map((part) => part.text ?? '').join('') : '';
};
const imagesIn = (turn) => {
  const content = turn?.content ?? turn?.parts;
  return Array.isArray(content) ? content.filter((part) => part.type === 'image_url' || part.type === 'image' || part.inlineData).length : 0;
};

/** Talks back to a greeting, describes images, draws for anything else — like the real assistant is asked to. */
const replyFor = (body, path) => {
  let request = {};
  try { request = JSON.parse(body); } catch { return { text: DRAW }; }
  const turns = request.messages ?? request.contents ?? [];
  const last = turns[turns.length - 1];
  if (last?.role === 'tool') return { text: 'Here is a start.' };
  const images = imagesIn(last);
  if (images) return { text: `I can see ${images} ${images === 1 ? 'image' : 'images'}.` };
  if (/(?:^|\n)hi\s*$/i.test(textOf(last))) return { text: CHAT };
  if (path.includes('/chat/completions') && request.tools?.some((tool) => tool.function?.name === 'add_diagram')) {
    return { call: { id: 'call_stub', type: 'function', function: { name: 'add_diagram', arguments: JSON.stringify({ dsl: 'flowchart\n  Stub -> Works' }) } } };
  }
  return { text: DRAW };
};

const successFor = (path, body) => {
  const reply = replyFor(body, path);
  const text = reply.text ?? '';
  if (path.includes(':generateContent')) return { candidates: [{ content: { parts: [{ text }] } }] };
  if (path === '/v1/messages') return { content: [{ type: 'text', text }] };
  return { choices: [{ message: reply.call ? { content: null, tool_calls: [reply.call] } : { content: text } }] };
};

const failureFor = (key) => {
  if (key === 'sk-bad') return { status: 401, body: { error: { message: `Incorrect API key provided: ${key}` } } };
  if (key === 'sk-model') return { status: 404, body: { error: { message: `The model "stub" does not exist, learn more at platform.example` } } };
  if (key === 'sk-ratelimited') return { status: 429, body: { error: { message: 'rate limit reached' } } };
  if (key === 'sk-down') return { status: 503, body: { error: { message: 'overloaded' } } };
  return null;
};

export function createStubProviderServer() {
  return createServer((request, response) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization, x-api-key, x-goog-api-key, http-referer, x-title, anthropic-version, anthropic-dangerous-direct-browser-access',
    };
    if (request.method === 'OPTIONS') {
      response.writeHead(204, cors);
      response.end();
      return;
    }
    if (request.url === '/health') {
      response.writeHead(200, { ...cors, 'content-type': 'application/json' });
      response.end('{"ok":true}');
      return;
    }
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const key = String(
        request.headers['x-goog-api-key'] ?? request.headers['x-api-key']
        ?? String(request.headers.authorization ?? '').replace(/^Bearer\s+/i, ''),
      );
      const failure = failureFor(key);
      const path = request.url ?? '';
      if (key === 'sk-malformed') {
        response.writeHead(200, { ...cors, 'content-type': 'text/plain' });
        response.end('<html>not json</html>');
        console.log(`stub ${path} → 200 malformed`);
        return;
      }
      if (failure && key !== 'sk-ok') {
        response.writeHead(failure.status, { ...cors, 'content-type': 'application/json' });
        response.end(JSON.stringify(failure.body));
        console.log(`stub ${path} → ${failure.status}`);
        return;
      }
      response.writeHead(200, { ...cors, 'content-type': 'application/json' });
      response.end(JSON.stringify(successFor(path, body)));
      console.log(`stub ${path} → 200`);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createStubProviderServer().listen(PORT, '127.0.0.1', () => {
    console.log(`stub provider listening on http://127.0.0.1:${PORT}`);
  });
}
