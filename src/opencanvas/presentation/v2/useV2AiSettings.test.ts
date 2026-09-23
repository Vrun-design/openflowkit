import { describe, expect, it } from 'vitest';
import { activeConnection, parseAiSettings, withConnection, withoutKeys } from './useV2AiSettings';

describe('AI settings', () => {
  it('moves the old single-key shape onto the provider it was saved for', () => {
    const settings = parseAiSettings(JSON.stringify({ provider: 'gemini', apiKey: 'AIza1', baseUrl: '', model: 'gemini-3.8-flash' }));
    expect(settings).toEqual({ provider: 'gemini', connections: { gemini: { apiKey: 'AIza1', baseUrl: '', model: 'gemini-3.8-flash' } } });
    expect(parseAiSettings(null)).toEqual({ provider: 'claude', connections: {} });
    expect(parseAiSettings('{not json')).toEqual({ provider: 'claude', connections: {} });
    expect(parseAiSettings(JSON.stringify({ provider: 'nope', connections: { gemini: { apiKey: 'k' }, bogus: {} } })))
      .toEqual({ provider: 'claude', connections: { gemini: { apiKey: 'k', baseUrl: '', model: '' } } });
  });

  it('never carries a key to another provider, and clears every key at once', () => {
    const claude = withConnection({ provider: 'claude', connections: {} }, { apiKey: 'sk-ant-1', model: 'claude-opus-5' });
    const gemini = { ...claude, provider: 'gemini' as const };
    expect(activeConnection(gemini)).toEqual({ apiKey: '', baseUrl: '', model: '' });
    const both = withConnection(gemini, { apiKey: 'AIza2' });
    expect(activeConnection({ ...both, provider: 'claude' }).apiKey).toBe('sk-ant-1');
    const cleared = withoutKeys(both);
    expect(Object.values(cleared.connections).map((connection) => connection?.apiKey)).toEqual(['', '']);
    expect(activeConnection({ ...cleared, provider: 'claude' }).model).toBe('claude-opus-5');
  });
});
