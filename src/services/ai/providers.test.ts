import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_PROVIDERS, RISK_DETAILS, RISK_LABELS, isConfigured, providerById,
  type AiProviderDefinition, type AiProviderId, type AiWireFormat,
} from './providers';

const LOGO_DIR = path.resolve(process.cwd(), 'public/logos');

/** Ids whose logo file is not on disk; `exists` is injectable so the check itself is testable. */
const missingLogos = (
  definitions: readonly AiProviderDefinition[],
  exists: (file: string) => boolean = existsSync,
): AiProviderId[] =>
  definitions
    .filter((definition) => !definition.logoPath || !exists(path.join(LOGO_DIR, path.basename(definition.logoPath))))
    .map((definition) => definition.id);

describe('AI provider catalogue', () => {
  it('ships the ten V1 providers with unique ids and marks', () => {
    expect(AI_PROVIDERS).toHaveLength(10);
    expect(new Set(AI_PROVIDERS.map(({ id }) => id)).size).toBe(10);
    expect(AI_PROVIDERS.map(({ id }) => id)).toEqual([
      'gemini', 'openai', 'claude', 'groq', 'nvidia',
      'cerebras', 'mistral', 'openrouter', 'ollama', 'custom',
    ]);
  });

  it('points every logo at a file that exists', () => {
    expect(missingLogos(AI_PROVIDERS)).toEqual([]);
  });

  it('fails the logo check when a logo is missing', () => {
    const broken = { ...providerById('gemini'), logoPath: '/logos/not-shipped.svg' };
    expect(missingLogos([broken])).toEqual(['gemini']);
  });

  it('uses https everywhere except the local Ollama daemon, and knows custom needs the user', () => {
    for (const definition of AI_PROVIDERS) {
      if (definition.id === 'ollama') {
        expect(definition.defaultBaseUrl).toBe('http://localhost:11434/v1');
      } else if (definition.id === 'custom') {
        expect(definition.defaultBaseUrl).toBe('');
        expect(definition.defaultModel).toBe('');
      } else {
        expect(definition.defaultBaseUrl).toMatch(/^https:\/\//);
        expect(definition.defaultModel).not.toBe('');
      }
    }
  });

  it('suggests models with the default first, and gives thinking models room to answer', () => {
    for (const definition of AI_PROVIDERS) {
      if (definition.id === 'custom') {
        expect(definition.suggestedModels).toEqual([]);
        continue;
      }
      expect(definition.suggestedModels[0], definition.id).toBe(definition.defaultModel);
      expect(new Set(definition.suggestedModels).size).toBe(definition.suggestedModels.length);
      // Hosted defaults think before they answer; a 4k budget truncates the diagram.
      if (definition.id !== 'ollama') expect(definition.maxOutputTokens, definition.id).toBeGreaterThanOrEqual(16_000);
    }
  });

  it('places the key the way each provider documents it', () => {
    for (const definition of AI_PROVIDERS) {
      const key = definition.keyPlaceholder.replace(/\.\.\.$/, '');
      if (definition.keyPattern && key && definition.id !== 'custom') {
        expect(key, definition.id).toMatch(new RegExp(definition.keyPattern));
      }
      if (!definition.needsKey) expect(definition.keyPattern).toBe('');
    }
    expect(providerById('ollama').needsKey).toBe(false);
  });

  it('documents all three wire formats and all three risk ratings', () => {
    const wires = new Set<AiWireFormat>(AI_PROVIDERS.map(({ wire }) => wire));
    expect(wires).toEqual(new Set<AiWireFormat>(['openai', 'anthropic', 'google']));
    for (const definition of AI_PROVIDERS) {
      expect(RISK_LABELS[definition.risk]).toBeTruthy();
      expect(RISK_DETAILS[definition.risk]).toBeTruthy();
    }
    expect(providerById('gemini').wire).toBe('google');
    expect(providerById('claude').wire).toBe('anthropic');
    expect(providerById('groq').wire).toBe('openai');
  });

  it('only calls a provider ready when it has what that provider needs', () => {
    const blank = { apiKey: '', baseUrl: '', model: '' };
    expect(isConfigured(providerById('claude'), blank)).toBe(false);
    expect(isConfigured(providerById('ollama'), blank)).toBe(true);
    expect(isConfigured(providerById('custom'), blank)).toBe(false);
    expect(isConfigured(providerById('custom'), { ...blank, apiKey: 'k', baseUrl: 'https://proxy.example/v1', model: 'm' })).toBe(true);
  });
});
