import { z } from 'zod';
import {
  createTransformCommand, createTransformSnapshot, resizeTransform, rotateTransform,
} from '@/opencanvas/domain/transforms/transformSelection';
import { areStructurallyEqual } from '@/opencanvas/domain/commands/equality';
import type { ScenePage } from '@/opencanvas/domain/document/types';
import { defineAction, requireNode } from './defineAction';

// Resize and rotate through the same transform math a handle drag uses, so the
// record equals a pointer gesture (scale-based resize, centre rotation).
export const transformNode = defineAction({
  name: 'transform_node',
  description: 'Resize a node to width/height (page units) and/or rotate it to an absolute angle in degrees.',
  schema: z.object({
    id: z.string().min(1),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    rotationDegrees: z.number().finite().optional(),
  }).refine((input) => input.width !== undefined || input.height !== undefined || input.rotationDegrees !== undefined,
    { message: 'Provide width, height or rotationDegrees.' }),
  run: (input, { page }) => {
    requireNode(page, input.id);
    const snapshot = createTransformSnapshot(page, [input.id]);
    let nodes = snapshot.nodes;
    let label = 'Resize selection';
    if (input.width !== undefined || input.height !== undefined) {
      const { bounds } = snapshot;
      const pointer = { x: bounds.x + (input.width ?? bounds.width), y: bounds.y + (input.height ?? bounds.height) };
      nodes = resizeTransform(snapshot, { handle: 'south-east', pointer, snap: false }).nodes;
    }
    if (input.rotationDegrees !== undefined) {
      const rotated: ScenePage = { ...page, nodes: page.nodes.map((node) => nodes.find((next) => next.id === node.id) ?? node) };
      const current = createTransformSnapshot(rotated, [input.id]);
      const center = { x: current.bounds.x + current.bounds.width / 2, y: current.bounds.y + current.bounds.height / 2 };
      const delta = (input.rotationDegrees * Math.PI) / 180 - current.nodes[0].transform.rotationRadians;
      const start = { x: center.x + 1, y: center.y };
      const end = { x: center.x + Math.cos(delta), y: center.y + Math.sin(delta) };
      nodes = rotateTransform(rotated, current, start, end, false).nodes;
      label = input.width === undefined && input.height === undefined ? 'Rotate selection' : 'Transform selection';
    }
    const changed = nodes.some((node, index) => !areStructurallyEqual(node, snapshot.nodes[index]));
    return {
      command: changed ? createTransformCommand(page.id, snapshot.nodes, nodes, label, `transform-node:${input.id}`) : null,
      output: { id: input.id },
    };
  },
});
