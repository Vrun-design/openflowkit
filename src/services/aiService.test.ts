import { describe, expect, it } from 'vitest';
import { parseClaudeContent, parseOpenAICompatibleContent } from './aiService';

describe('aiService response parsing', () => {
  it('returns the message content for OpenAI-compatible responses', () => {
    const result = parseOpenAICompatibleContent({
      choices: [{ message: { content: 'flow: Test' } }],
    });

    expect(result).toEqual({ ok: true, value: 'flow: Test' });
  });

  it('returns a typed error when OpenAI-compatible content is missing', () => {
    const result = parseOpenAICompatibleContent({ choices: [] });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe('bad_response');
    }
  });

  it('returns the text content for Claude responses', () => {
    const result = parseClaudeContent({
      content: [{ text: 'flow: Claude' }],
    });

    expect(result).toEqual({ ok: true, value: 'flow: Claude' });
  });

  it('returns a typed error when Claude content is missing', () => {
    const result = parseClaudeContent({ content: [] });

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe('bad_response');
    }
  });
});
