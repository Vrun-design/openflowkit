import { matchIconId, type IconResolution } from '../../dsl/iconMatch';
import { SVG_SOURCES } from '../shapeLibrary/providerCatalog';

export type DslIconResolution = IconResolution;

let byProvider: Map<string, string[]> | null = null;

function shapeIds(provider: string): readonly string[] {
  if (!byProvider) {
    byProvider = new Map();
    for (const source of SVG_SOURCES) byProvider.set(source.provider, [...(byProvider.get(source.provider) ?? []), source.shapeId]);
  }
  return byProvider.get(provider) ?? [];
}

/** Resolves stable provider/icon DSL ids against bundled local catalogs. */
export function resolveDslIcon(id: string): DslIconResolution | null {
  return matchIconId(id, shapeIds);
}
