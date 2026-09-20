import { z } from 'zod';
import { buildStyleNodesCommand } from '@/opencanvas/domain/commands/styleNodes';
import { defineAction, requireNode } from './defineAction';

const color = z.string().regex(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i, 'Colors are #rrggbb or #rrggbbaa.');

export const setStyle = defineAction({
  name: 'set_style',
  description: 'Style one or more nodes: fill, stroke, strokeWidth, strokeStyle (solid|dashed|dotted), opacity (0–1). One undo step.',
  schema: z.object({
    ids: z.array(z.string().min(1)).min(1),
    fill: color.optional(),
    stroke: color.optional(),
    strokeWidth: z.number().min(0).max(32).optional(),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    opacity: z.number().min(0).max(1).optional(),
  }).refine(({ ids: _ids, ...patch }) => Object.values(patch).some((value) => value !== undefined),
    { message: 'Provide at least one style property.' }),
  run: ({ ids, ...patch }, { page }) => {
    for (const id of ids) requireNode(page, id);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    return { command: buildStyleNodesCommand(page, ids, defined), output: { ids } };
  },
});
