import { z } from 'zod';

export const diagramDocumentEnvelopeSchema = z.object({
  version: z.string().optional(),
  name: z.string().optional(),
  createdAt: z.string().optional(),
  diagramType: z.string().optional(),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
  documentCapabilities: z.record(z.boolean()).optional(),
  scenes: z.array(z.unknown()).optional(),
  timeline: z.array(z.unknown()).optional(),
  exportPresets: z.array(z.unknown()).optional(),
  bindings: z.array(z.unknown()).optional(),
  playback: z.unknown().optional(),
});
