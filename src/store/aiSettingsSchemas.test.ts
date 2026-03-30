import { describe, expect, it } from 'vitest';
import {
  parsePersistedAISettings,
  parsePersistedAISettingsJson,
} from './aiSettingsSchemas';

describe('aiSettingsSchemas', () => {
  it('parses valid persisted AI settings objects', () => {
    expect(
      parsePersistedAISettings({
        provider: 'openai',
        storageMode: 'local',
        model: 'gpt-4o',
        customHeaders: [{ key: 'Authorization', value: 'Bearer token' }],
      })
    ).toEqual({
      provider: 'openai',
      storageMode: 'local',
      model: 'gpt-4o',
      customHeaders: [{ key: 'Authorization', value: 'Bearer token' }],
    });
  });

  it('keeps only valid persisted AI settings fields from mixed objects', () => {
    expect(
      parsePersistedAISettings({
        provider: 'not-a-provider',
        storageMode: 'session',
        model: 'claude-3.7',
        customHeaders: 'bad',
      })
    ).toEqual({
      storageMode: 'session',
      model: 'claude-3.7',
    });
  });

  it('parses valid persisted AI settings JSON', () => {
    expect(
      parsePersistedAISettingsJson(
        JSON.stringify({
          provider: 'custom',
          storageMode: 'local',
          customBaseUrl: 'https://example.com',
        })
      )
    ).toEqual({
      provider: 'custom',
      storageMode: 'local',
      customBaseUrl: 'https://example.com',
    });
  });

  it('drops malformed persisted AI settings JSON', () => {
    expect(parsePersistedAISettingsJson('{not-json')).toBeUndefined();
  });
});
