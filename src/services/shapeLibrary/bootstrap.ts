import { createShapePackRegistry, type ShapePackRegistry } from './registry';
import { STARTER_SHAPE_PACKS } from './starterPacks';

let runtimeRegistry: ShapePackRegistry | null = null;

export function createRuntimeShapePackRegistry(): ShapePackRegistry {
    return createShapePackRegistry(STARTER_SHAPE_PACKS);
}

export function getRuntimeShapePackRegistry(): ShapePackRegistry {
    if (!runtimeRegistry) {
        runtimeRegistry = createRuntimeShapePackRegistry();
    }
    return runtimeRegistry;
}

export function resetRuntimeShapePackRegistryForTests(): void {
    runtimeRegistry = null;
}
