import { describe, expect, it } from 'vitest';
import {
    DEFAULT_BASE_URLS,
    DEFAULT_MODELS,
    PROVIDERS,
    PROVIDER_MODELS,
    PROVIDER_RISK,
} from './aiProviders';

describe('aiProviders config consistency', () => {
    it('keeps provider metadata and model registry aligned', () => {
        const providerIds = PROVIDERS.map((provider) => provider.id);

        for (const id of providerIds) {
            expect(PROVIDER_MODELS[id]).toBeDefined();
            expect(DEFAULT_MODELS[id]).toBeDefined();
        }
    });

    it('keeps provider risk map aligned with provider metadata', () => {
        const providerIds = new Set(PROVIDERS.map((provider) => provider.id));
        const riskIds = new Set(Object.keys(PROVIDER_RISK));

        expect(riskIds).toEqual(providerIds);
    });

    it('provides default base urls for all non-gemini and non-claude providers', () => {
        const required = PROVIDERS
            .map((provider) => provider.id)
            .filter((id) => id !== 'gemini' && id !== 'claude');

        for (const id of required) {
            expect(DEFAULT_BASE_URLS[id]).toBeTruthy();
        }
    });
});
