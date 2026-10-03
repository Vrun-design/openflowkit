import { describe, expect, it } from 'vitest';
import { activeConnection, parseAiSettings, withConnection, withoutKeys, carryOverV1Ai } from './useV2AiSettings';

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

describe('carryOverV1Ai', () => {
  const seed = 'https://app.openflowkit.com:Mozilla/5.0 Test:openflowkit-ai-settings-secret';
  // v1's own masking (main `aiSettingsPersistence.ts` maskSecret).
  const mask = (secret: string, withSeed = seed) => `v1:${btoa(unescape(encodeURIComponent(
    Array.from(secret, (char, index) => String.fromCharCode(char.charCodeAt(0) ^ withSeed.charCodeAt(index % withSeed.length))).join(''))))}`;
  const v1 = { settings: JSON.stringify({ provider: 'openai', storageMode: 'local', model: 'gpt-4.1' }), secret: mask('sk-test-123') };
  const empty = parseAiSettings(null);

  it('takes the plain key v1’s local-first runtime kept in IndexedDB', () => {
    const fromIdb = { settings: JSON.stringify({ provider: 'groq', storageMode: 'local', apiKey: ' gsk_plain ', model: 'llama' }), secret: null };
    expect(carryOverV1Ai(empty, true, fromIdb, seed).connections.groq).toEqual({ apiKey: 'gsk_plain', baseUrl: '', model: 'llama' });
    const session = { settings: JSON.stringify({ provider: 'groq', storageMode: 'session', apiKey: 'gsk_plain' }), secret: null };
    expect(carryOverV1Ai(empty, true, session, seed)).toBe(empty);
  });

  it('brings v1’s masked key, model and provider into a fresh v2', () => {
    expect(carryOverV1Ai(empty, true, v1, seed)).toEqual({
      provider: 'openai', connections: { openai: { apiKey: 'sk-test-123', baseUrl: '', model: 'gpt-4.1' } },
    });
  });

  it('fills only an empty slot and keeps the v2 pick', () => {
    const v2 = { provider: 'claude' as const, connections: { claude: { apiKey: 'sk-ant', baseUrl: '', model: '' } } };
    expect(carryOverV1Ai(v2, false, v1, seed).provider).toBe('claude');
    expect(carryOverV1Ai(v2, false, v1, seed).connections.openai?.apiKey).toBe('sk-test-123');
    const has = { provider: 'openai' as const, connections: { openai: { apiKey: 'sk-v2', baseUrl: '', model: '' } } };
    expect(carryOverV1Ai(has, false, v1, seed)).toBe(has);
  });

  it('brings nothing it cannot read: a session-only key, another browser’s mask, broken JSON', () => {
    expect(carryOverV1Ai(empty, true, { ...v1, secret: null }, seed)).toBe(empty);
    expect(carryOverV1Ai(empty, true, { ...v1, secret: mask('sk-test-123', 'other seed') }, seed)).toBe(empty);
    expect(carryOverV1Ai(empty, true, { ...v1, settings: '{nope' }, seed)).toBe(empty);
  });
});
