// "Report" on an assistant reply: a prefilled GitHub issue the user reads and
// edits before posting. Carries the exchange and the model, never a key or the
// endpoint (a custom base URL can name a private host).
export const ISSUE_URL = 'https://github.com/Vrun-design/openflowkit/issues/new';

export interface AssistantReportInput {
  readonly prompt: string;
  readonly reply: string;
  readonly provider: string;
  readonly model: string;
  readonly error?: string;
}

// ponytail: GitHub serves ~8k-char URLs; cut each field so the whole link fits.
const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max)}\n… (cut)` : text);

export function assistantIssueUrl({ prompt, reply, provider, model, error }: AssistantReportInput): string {
  const firstLine = prompt.trim().split('\n')[0] ?? '';
  const body = [
    '### What went wrong',
    '<!-- What did you expect instead? -->',
    '',
    '### Prompt',
    '```', clip(prompt.trim(), 1500), '```',
    '',
    '### Reply',
    '```', clip(reply.trim() || '(empty)', 3000), '```',
    ...(error ? ['', '### Error', '```', clip(error, 600), '```'] : []),
    '',
    `Provider: ${provider} · Model: ${model}`,
  ].join('\n');
  const params = new URLSearchParams({
    title: `Assistant: ${firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine}`,
    body,
    labels: 'ai-assistant',
  });
  return `${ISSUE_URL}?${params.toString()}`;
}
