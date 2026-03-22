import { describe, expect, it } from 'vitest';
import { sanitizeAISettings } from './aiSettings';
import { DEFAULT_AI_SETTINGS } from './defaults';

describe('aiSettings', () => {
  it('falls back to defaults for invalid provider values', () => {
    const sanitized = sanitizeAISettings(
      {
        provider: 'not-a-provider' as never,
        apiKey: '  secret  ',
        model: '  gemini-2.5-pro  ',
        customBaseUrl: '  https://example.com  ',
      },
      DEFAULT_AI_SETTINGS
    );

    expect(sanitized.provider).toBe(DEFAULT_AI_SETTINGS.provider);
    expect(sanitized.apiKey).toBe('secret');
    expect(sanitized.model).toBe('gemini-2.5-pro');
    expect(sanitized.customBaseUrl).toBe('https://example.com');
  });

  it('keeps only valid custom headers', () => {
    const sanitized = sanitizeAISettings(
      {
        provider: 'custom',
        customHeaders: [
          { key: ' Authorization ', value: 'Bearer token', enabled: true },
          { key: '', value: 'skip-me' },
          { key: 'X-Empty', value: 10 as never },
        ],
      },
      DEFAULT_AI_SETTINGS
    );

    expect(sanitized.customHeaders).toEqual([
      { key: 'Authorization', value: 'Bearer token', enabled: true },
    ]);
  });
});
