// A pretend AI provider for trying the assistant without a key. It speaks the
// OpenAI wire (streamed), thinks out loud, calls the assistant's tools and
// types its answers at a readable pace, so every state of the panel shows up.
//
//   node scripts/ai-demo-server.mjs            # http://127.0.0.1:4400/v1
//   In the assistant: provider Custom, base URL http://127.0.0.1:4400/v1,
//   any key, any model id.
//
// What to type:
//   "hi"                 → a friendly Markdown reply
//   "review" / "explain" → a critique, no changes
//   "draw …"             → adds a checkout flow (tool step → review card)
//   "add …" / "change …" → on a page with a diagram: reads it, then updates it
//   attach an image      → describes it
//   "fail"               → a provider error (unknown model)
// SPEED=2 halves every pause; SPEED=0.5 doubles them.
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 4400);
const SPEED = Number(process.env.SPEED ?? 1);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms / SPEED));

const DRAW_DSL = 'flowchart\ntitle: Checkout\nCart -> Pay\nPay -> Ship\nShip -> Done';
const EXTRA = '\nPay -> Declined [label: card declined]\nDeclined -> Pay [label: retry once]\nDeclined -> Cancelled';

const HELLO = `Hi! I'm the OpenFlowKit assistant. I can:

- **Explain** a diagram in plain words
- **Review** it and point out gaps
- **Draw** a new one, or \`change\` an existing one

Try *"draw a checkout flow"*.`;

const REVIEW = `## What works
The happy path reads cleanly from **Cart** to **Done**.

## What's missing
1. No failure branch after **Pay** — what happens when a card is declined?
2. No end state for a cancelled order.
3. \`Ship\` hides two steps: packing and handover.

Want me to add the failure path?`;

const lastOf = (messages) => messages[messages.length - 1] ?? {};
const textOf = (message) => (typeof message.content === 'string' ? message.content
  : Array.isArray(message.content) ? message.content.map((part) => part.text ?? '').join('') : '');
const imagesOf = (message) => (Array.isArray(message.content) ? message.content.filter((part) => part.type === 'image_url').length : 0);
const ask = (message) => textOf(message).replace(/<canvas>[\s\S]*?<\/canvas>/, '').trim().toLowerCase();

/** What to do next: think, then say something and/or call one tool. */
function plan(request) {
  const messages = request.messages ?? [];
  const last = lastOf(messages);
  if (last.role === 'tool') {
    const call = [...messages].reverse().find((message) => message.tool_calls)?.tool_calls?.[0];
    if (call?.function?.name === 'read_diagram') {
      const dsl = /```openflow\n([\s\S]*?)\n```/.exec(last.content)?.[1] ?? DRAW_DSL;
      const frameId = /frame=(\S+)/.exec(last.content)?.[1];
      return { think: 'The happy path is there; I will add a declined branch with one retry.', call: ['update_diagram', { frame_id: frameId, dsl: dsl + EXTRA }] };
    }
    if (call?.function?.name === 'add_diagram') return { text: 'I drafted a **checkout flow** — cart, payment, shipping. Review it below, then apply.' };
    return { text: 'I added a **declined card** branch that retries once, then cancels. Review the change below.' };
  }
  const prompt = ask(last);
  const images = imagesOf(last);
  if (images) return { think: 'Looking at the attached image.', text: `I can see ${images} ${images === 1 ? 'image' : 'images'}. It looks like a rough flow sketch — want me to redraw it as a diagram?` };
  if (prompt.includes('fail')) return { status: 404 };
  if (/^(hi|hello|hey)\b/.test(prompt)) return { think: 'A greeting. Say what I can do, briefly.', text: HELLO };
  if (/review|explain|critique|what/.test(prompt)) return { think: 'Reading the diagram on the page and looking for gaps in the flow.', text: REVIEW };
  const frame = /frame=(\S+)/.exec(textOf(last))?.[1];
  if (frame && /add|change|update|edit|retry|error|fail/.test(prompt)) {
    return { think: 'The user wants a change to the diagram on the page. Read it first.', text: 'Let me look at the diagram first.', call: ['read_diagram', { frame_id: frame }] };
  }
  return { think: 'A new diagram: a checkout flow is a good small start.', call: ['add_diagram', { dsl: DRAW_DSL }] };
}

async function stream(response, { think, text, call }) {
  const send = (delta) => response.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
  await sleep(900);
  for (const word of (think ?? '').split(/(?<= )/)) { if (word) { send({ reasoning_content: word }); await sleep(70); } }
  if (think) await sleep(500);
  for (const word of (text ?? '').split(/(?<=[ \n])/)) { if (word) { send({ content: word }); await sleep(45); } }
  if (call) {
    await sleep(300);
    send({ tool_calls: [{ index: 0, id: `call_${Date.now()}`, type: 'function', function: { name: call[0], arguments: JSON.stringify(call[1]) } }] });
  }
  response.end('data: [DONE]\n\n');
}

createServer((request, response) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };
  if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return; }
  if (request.url === '/health') { response.writeHead(200, cors); response.end('ok'); return; }
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(body); } catch { /* answered below as a plain reply */ }
    const next = plan(parsed);
    if (next.status) {
      response.writeHead(next.status, { ...cors, 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'The model "demo" does not exist' } }));
      return;
    }
    response.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    void stream(response, next);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`AI demo provider on http://127.0.0.1:${PORT}/v1 (Custom provider, any key)`));
