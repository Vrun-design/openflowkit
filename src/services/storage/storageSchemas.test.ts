import { describe, expect, it } from 'vitest';
import {
  parseLegacyChatMessagesJson,
  parsePersistentAISettingsJson,
} from './storageSchemas';

describe('storageSchemas', () => {
  it('parses valid persistent AI settings JSON', () => {
    expect(
      parsePersistentAISettingsJson(
        JSON.stringify({
          provider: 'openai',
          storageMode: 'local',
          apiKey: 'secret',
          customHeaders: [{ key: 'Authorization', value: 'Bearer token' }],
        })
      )
    ).toEqual({
      provider: 'openai',
      storageMode: 'local',
      apiKey: 'secret',
      customHeaders: [{ key: 'Authorization', value: 'Bearer token' }],
    });
  });

  it('keeps only valid fields from mixed persistent AI settings JSON', () => {
    expect(
      parsePersistentAISettingsJson(
        JSON.stringify({
          provider: 'invalid-provider',
          storageMode: 'local',
        })
      )
    ).toEqual({
      storageMode: 'local',
    });
  });

  it('parses valid legacy chat JSON', () => {
    expect(
      parseLegacyChatMessagesJson(
        JSON.stringify([
          { role: 'user', parts: ['Hello'] },
          {
            role: 'model',
            parts: [{ text: 'World' }, { inlineData: { mimeType: 'image/png', data: 'abc' } }],
          },
        ])
      )
    ).toEqual([
      { role: 'user', parts: [{ text: 'Hello' }] },
      {
        role: 'model',
        parts: [{ text: 'World' }, { inlineData: { mimeType: 'image/png', data: 'abc' } }],
      },
    ]);
  });

  it('drops malformed legacy chat JSON', () => {
    expect(
      parseLegacyChatMessagesJson(
        JSON.stringify([{ role: 'system', parts: ['bad'] }])
      )
    ).toEqual([]);
  });
});
