import { describe, expect, it } from 'vitest';
import {
    createRuntimeShapePackRegistry,
    getRuntimeShapePackRegistry,
    resetRuntimeShapePackRegistryForTests,
} from './bootstrap';

describe('shape library bootstrap', () => {
    it('returns starter packs from the runtime registry', () => {
        const registry = createRuntimeShapePackRegistry();
        const packIds = registry.listPacks().map((pack) => pack.id);

        expect(packIds).toEqual(['starter-core-v1']);
    });

    it('keeps a singleton runtime registry instance', () => {
        resetRuntimeShapePackRegistryForTests();
        const registryA = getRuntimeShapePackRegistry();
        const registryB = getRuntimeShapePackRegistry();

        expect(registryA).toBe(registryB);
    });
});
