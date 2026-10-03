// npm run eval:validity — the number we launch on (plan 13.4). A model writes
// each of 50 prompts twice, once as Mermaid and once as OpenFlow DSL; the real
// MCP tools score it. An invalid answer gets one round with the diagnostics.
// Costs money and needs a key: run it on purpose, never in CI.
//
//   EVAL_PROVIDER=claude EVAL_API_KEY=sk-ant-… npm run eval:validity
//   EVAL_MODEL=…      model id (default: claude-haiku-4-5 on claude, else the provider's default)
//   EVAL_LIMIT=4      first N prompts only, for a smoke run
//
// The model client is the app's own BYOK layer, so any of its ten providers works.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServerWithDeps } from '../../src/server.js';
import { createProvider, type AiMessage, type AiProvider } from '../../../src/services/ai/provider';
import type { AiProviderId } from '../../../src/services/ai/providers';
import { scoreCase, type CaseScore } from './score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
type Format = 'mermaid' | 'dsl';
interface Prompt { readonly id: string; readonly family: string; readonly prompt: string }
interface Attempt extends CaseScore { readonly text: string }
interface CaseResult { readonly id: string; readonly family: string; readonly format: Format; readonly first: Attempt; readonly second?: Attempt; readonly error?: string }

const MERMAID_TYPE: Record<string, string> = {
  flowchart: 'flowchart', architecture: 'architecture-beta', sequence: 'sequenceDiagram',
  erd: 'erDiagram', state: 'stateDiagram-v2', class: 'classDiagram', mindmap: 'mindmap',
};

async function connect(): Promise<Client> {
  const { server } = createServerWithDeps({ log: () => undefined });
  const client = new Client({ name: 'validity-eval', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), client.connect(a)]);
  return client;
}

/** What an agent sees before writing: the skill for DSL (plus the family's grammar), or a plain Mermaid ask. */
async function systemFor(client: Client, format: Format, family: string, skill: string): Promise<string> {
  if (format === 'mermaid') {
    return `You draw diagrams as Mermaid. Answer with one fenced \`\`\`mermaid block using the ${MERMAID_TYPE[family]} diagram type, nothing else.`;
  }
  const syntax = await client.callTool({ name: 'get_syntax', arguments: { family } });
  const grammar = ((syntax.content ?? []) as { text?: string }[])[0]?.text ?? '';
  return `${skill}\n\n## Grammar for ${family}\n\n${grammar}\n\nAnswer with one fenced \`\`\`dsl block in the ${family} family, nothing else.`;
}

async function runCase(model: AiProvider, client: Client, prompt: Prompt, format: Format, skill: string): Promise<CaseResult> {
  const system = await systemFor(client, format, prompt.family, skill);
  const messages: AiMessage[] = [{ role: 'user', content: prompt.prompt }];
  try {
    const firstText = await model.complete({ system, messages });
    const first = { text: firstText, ...await scoreCase(client, firstText) };
    if (first.valid) return { id: prompt.id, family: prompt.family, format, first };
    const retry: AiMessage[] = [...messages, { role: 'assistant', content: firstText }, {
      role: 'user', content: `The tool rejected it:\n${first.problems.join('\n')}\nFix it and answer with the whole diagram again.`,
    }];
    const secondText = await model.complete({ system, messages: retry });
    return { id: prompt.id, family: prompt.family, format, first, second: { text: secondText, ...await scoreCase(client, secondText) } };
  } catch (error) {
    const empty: Attempt = { text: '', valid: false, problems: [], warnings: 0, losses: 0, nodes: 0 };
    return { id: prompt.id, family: prompt.family, format, first: empty, error: error instanceof Error ? error.message : String(error) };
  }
}

/** A few cases at a time: providers rate-limit, and order does not matter. */
async function pool<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]!);
    }
  }));
  return results;
}

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

function summarize(results: readonly CaseResult[]) {
  const rows = (subset: readonly CaseResult[]) => ({
    cases: subset.length,
    firstTryValid: percent(subset.filter(({ first }) => first.valid).length, subset.length),
    validAfterOneRound: percent(subset.filter(({ first, second }) => first.valid || second?.valid).length, subset.length),
    withWarnings: percent(subset.filter(({ first, second }) => ((first.valid ? first : second)?.warnings ?? 0) > 0).length, subset.length),
    providerErrors: subset.filter(({ error }) => error).length,
  });
  const formats = ['mermaid', 'dsl'] as const;
  return {
    overall: Object.fromEntries(formats.map((format) => [format, rows(results.filter((result) => result.format === format))])),
    byFamily: Object.fromEntries([...new Set(results.map(({ family }) => family))].map((family) => [family,
      Object.fromEntries(formats.map((format) => [format, rows(results.filter((result) => result.family === family && result.format === format))]))])),
  };
}

async function main(): Promise<void> {
  const provider = (process.env.EVAL_PROVIDER ?? 'claude') as AiProviderId;
  const apiKey = process.env.EVAL_API_KEY ?? '';
  const modelId = process.env.EVAL_MODEL ?? (provider === 'claude' ? 'claude-haiku-4-5' : undefined);
  const model = createProvider({ provider, apiKey, ...(modelId ? { model: modelId } : {}) });
  const limit = Number.parseInt(process.env.EVAL_LIMIT ?? '', 10);
  const all = JSON.parse(await readFile(resolve(HERE, 'prompts.json'), 'utf8')) as Prompt[];
  const prompts = Number.isFinite(limit) ? all.slice(0, limit) : all;
  const skill = (await readFile(resolve(REPO, 'skills/openflowkit/SKILL.md'), 'utf8')).replace(/^---\n[\s\S]*?\n---\n/, '');
  const client = await connect();

  const cases = prompts.flatMap((prompt) => (['mermaid', 'dsl'] as const).map((format) => ({ prompt, format })));
  let done = 0;
  const results = await pool(cases, 4, async ({ prompt, format }) => {
    const result = await runCase(model, client, prompt, format, skill);
    process.stderr.write(`\r${++done}/${cases.length} ${result.error ? 'provider error' : result.first.valid ? 'ok' : result.second?.valid ? 'ok after retry' : 'invalid'}        `);
    return result;
  });
  process.stderr.write('\n');

  const date = new Date().toISOString().slice(0, 10);
  const report = { date, provider, model: model.model, prompts: prompts.length, summary: summarize(results), results };
  const out = resolve(HERE, 'results', `${date}-${model.model.replace(/[^\w.-]+/g, '_')}.json`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ model: model.model, ...report.summary.overall }, null, 2));
  console.log(`Full results: ${out}`);
  await client.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
