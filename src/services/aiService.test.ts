import { describe, expect, it } from 'vitest';
import { parseClaudeContent, parseOpenAICompatibleContent } from './aiService';
import { parseClaudeStreamDelta, parseOpenAIStreamDelta } from './aiServiceSchemas';

describe('aiService response parsing', () => {
  describe('parseOpenAICompatibleContent', () => {
    it('returns the message content for valid responses', () => {
      const result = parseOpenAICompatibleContent({
        choices: [{ message: { content: 'flow: Test' } }],
      });
      expect(result).toEqual({ ok: true, value: 'flow: Test' });
    });

    it('trims whitespace-only content as bad_response', () => {
      const result = parseOpenAICompatibleContent({
        choices: [{ message: { content: '   ' } }],
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
      }
    });

    it('returns bad_response for empty choices array', () => {
      const result = parseOpenAICompatibleContent({ choices: [] });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
        expect(result.error.message).toContain('No content');
      }
    });

    it('returns bad_response when content is null', () => {
      const result = parseOpenAICompatibleContent({
        choices: [{ message: { content: null } }],
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
      }
    });

    it('returns bad_response when message is missing', () => {
      const result = parseOpenAICompatibleContent({
        choices: [{}],
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
      }
    });

    it('returns bad_response for null input', () => {
      const result = parseOpenAICompatibleContent(null);
      expect(result.ok).toBe(false);
    });

    it('returns bad_response for undefined input', () => {
      const result = parseOpenAICompatibleContent(undefined);
      expect(result.ok).toBe(false);
    });
  });

  describe('parseClaudeContent', () => {
    it('returns the text content for valid responses', () => {
      const result = parseClaudeContent({
        content: [{ text: 'flow: Claude' }],
      });
      expect(result).toEqual({ ok: true, value: 'flow: Claude' });
    });

    it('trims whitespace-only content as bad_response', () => {
      const result = parseClaudeContent({
        content: [{ text: '   ' }],
      });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
      }
    });

    it('returns bad_response for empty content array', () => {
      const result = parseClaudeContent({ content: [] });
      expect(result.ok).toBe(false);
      if (result.ok === false) {
        expect(result.error.code).toBe('bad_response');
        expect(result.error.message).toContain('Anthropic');
      }
    });

    it('returns bad_response when text is null', () => {
      const result = parseClaudeContent({
        content: [{ text: null }],
      });
      expect(result.ok).toBe(false);
    });

    it('returns bad_response when content is missing', () => {
      const result = parseClaudeContent({});
      expect(result.ok).toBe(false);
    });

    it('returns bad_response for null input', () => {
      const result = parseClaudeContent(null);
      expect(result.ok).toBe(false);
    });

    it('handles content with multiple items by taking the first', () => {
      const result = parseClaudeContent({
        content: [{ text: 'first' }, { text: 'second' }],
      });
      expect(result).toEqual({ ok: true, value: 'first' });
    });
  });

  describe('stream delta parsing', () => {
    it('extracts OpenAI-compatible text deltas safely', () => {
      expect(
        parseOpenAIStreamDelta(
          JSON.stringify({
            choices: [{ delta: { content: 'partial' } }],
          })
        )
      ).toBe('partial');
    });

    it('returns undefined for malformed OpenAI-compatible SSE lines', () => {
      expect(parseOpenAIStreamDelta('{bad-json')).toBeUndefined();
    });

    it('extracts Claude text deltas safely', () => {
      expect(
        parseClaudeStreamDelta(
          JSON.stringify({
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'partial' },
          })
        )
      ).toBe('partial');
    });

    it('returns undefined for malformed Claude SSE lines', () => {
      expect(parseClaudeStreamDelta('{bad-json')).toBeUndefined();
    });
  });
});
