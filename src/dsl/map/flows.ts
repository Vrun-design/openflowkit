import { compare, isInside } from './tree';
import type { Evidence, LinkKind, MapModel } from './types';

// A flow is a story told step by step; each step is proven by a real link or marked unproven
// (the surface draws it dashed with no evidence line). Steps naming a node that does not exist are
// dropped and reported, so an AI-written flow can never point at an invented box.

export interface FlowStepInput {
  from: string;
  to: string;
  text: string;
}

export interface FlowStep extends FlowStepInput {
  proof: { kind: LinkKind; evidence: Evidence[] } | null;
}

const PROOF_LINES = 3;

/**
 * Step A -> B is proven by any link from A (or anything inside it) to B (or anything inside it),
 * so a step between folders or parts is proven by the files beneath. The wrong direction is not.
 */
export function validateFlow(model: MapModel, steps: readonly FlowStepInput[]): { steps: FlowStep[]; errors: string[] } {
  const out: FlowStep[] = [];
  const errors: string[] = [];
  steps.forEach((s, i) => {
    const missing = [s.from, s.to].filter((id) => !model.nodes[id]);
    if (missing.length) {
      errors.push(`step ${i + 1}: unknown node ${missing.map((m) => `"${m}"`).join(', ')}`);
      return;
    }
    const hits = model.links.filter((l) => isInside(model, l.from, s.from) && isInside(model, l.to, s.to));
    const kind = (hits.find((l) => l.kind === 'import') ?? hits[0])?.kind;
    const evidence = hits
      .flatMap((l) => l.evidence)
      .sort((a, b) => compare(a.file, b.file) || a.line - b.line || compare(a.text, b.text))
      .slice(0, PROOF_LINES);
    out.push({ ...s, proof: kind ? { kind, evidence } : null });
  });
  return { steps: out, errors };
}
