import { describe, expect, it } from 'vitest';
import { assistantIssueUrl, ISSUE_URL } from './assistantReport';

describe('assistant report link', () => {
  it('prefills an issue with the exchange and the model', () => {
    const url = new URL(assistantIssueUrl({ prompt: 'hi\nthere', reply: 'Hello!', provider: 'gemini', model: 'gemini-3.8-flash', error: 'boom' }));
    expect(`${url.origin}${url.pathname}`).toBe(ISSUE_URL);
    expect(url.searchParams.get('title')).toBe('Assistant: hi');
    const body = url.searchParams.get('body')!;
    expect(body).toContain('hi\nthere');
    expect(body).toContain('Hello!');
    expect(body).toContain('### Error');
    expect(body).toContain('Provider: gemini · Model: gemini-3.8-flash');
  });

  it('stays inside a URL GitHub will serve, however long the reply', () => {
    const url = assistantIssueUrl({ prompt: 'p'.repeat(9000), reply: 'r'.repeat(20000), provider: 'x', model: 'y' });
    expect(url.length).toBeLessThan(8000);
  });
});
