import { inferIcon } from '../../../../dsl/autoIcon';
import { repoLook } from '../../../../dsl/map/repoLook';
import type { MapLook } from '../../../../dsl/map/scene';
import type { MapModel } from '../../../../dsl/map/types';
import type { ArchModel } from '../../../../dsl/model/types';
import { resolveDslIcon } from '../../../../services/dsl/iconResolver';
import { diagramPalette, paletteResolver, type DiagramPaletteName } from '../../../domain/nodes/nodePalette';

export function lookOf(arch: ArchModel, palette: DiagramPaletteName, autoIcons: boolean): MapLook {
  // The same choices a compile makes, so a map draws a box the way its Canvas page does.
  const auto = (arch.icons ?? (autoIcons ? 'auto' : 'off')) === 'auto';
  return {
    arch, swatch: paletteResolver(diagramPalette(arch.palette ?? palette)), resolveIcon: resolveDslIcon,
    ...(auto ? { inferIcon: (label: string, hint?: string) => { const id = inferIcon(label, hint); return id && resolveDslIcon(id) ? id : null; } } : {}),
  };
}

/** A repo map's boxes: the editor's own cards and palette, with plain repo words on them. */
export const repoLookOf = (model: MapModel, palette: DiagramPaletteName): MapLook =>
  repoLook(model, { swatch: paletteResolver(diagramPalette(palette)), resolveIcon: resolveDslIcon });
