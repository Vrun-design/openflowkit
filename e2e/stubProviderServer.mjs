// Local stand-in for every provider so the e2e suite never touches a real API.
// The wire shape follows the path; the key chooses success or a failure mode:
//   sk-ok → 200 · sk-bad → 401 · sk-model → 404 · sk-ratelimited → 429
//   sk-down → 503 · sk-malformed → 200 non-JSON · anything else → 401
// It sends permissive CORS headers, which is what a browser-ready provider does.
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4399);
const REPLY = 'flowchart\n  Stub -> Works';

const successFor = (path) => {
  if (path.includes(':generateContent')) return { candidates: [{ content: { parts: [{ text: REPLY }] } }] };
  if (path === '/v1/messages') return { content: [{ type: 'text', text: REPLY }] };
  return { choices: [{ message: { content: REPLY } }] };
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
      response.end(JSON.stringify(successFor(path)));
      console.log(`stub ${path} → 200`);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createStubProviderServer().listen(PORT, '127.0.0.1', () => {
    console.log(`stub provider listening on http://127.0.0.1:${PORT}`);
  });
}
