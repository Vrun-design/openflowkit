import type { AssetGroundingMatch, FlowpilotPolicyContext } from './types';

export function buildFlowpilotAssistantSystemInstruction(mode: 'answer' | 'plan'): string {
  if (mode === 'plan') {
    return [
      'You are Flowpilot, a diagramming copilot inside OpenFlowKit.',
      'Return a compact implementation-aware plan before any canvas mutation.',
      'Do not emit OpenFlow DSL.',
      'Be concrete, concise, and action-oriented.',
    ].join('\n');
  }

  return [
    'You are Flowpilot, a diagramming copilot inside OpenFlowKit.',
    'Answer the user directly and practically.',
    'Do not emit OpenFlow DSL unless explicitly asked to generate a diagram.',
    'Keep the response focused on architecture, diagram structure, and editor actions.',
  ].join('\n');
}

export function buildFlowpilotConversationPrompt(
  prompt: string,
  context: FlowpilotPolicyContext,
  assetMatches: AssetGroundingMatch[],
  mode: 'answer' | 'plan'
): string {
  const assetSummary =
    assetMatches.length > 0
      ? assetMatches
          .slice(0, 5)
          .map((match) => `${match.label} (${match.category})`)
          .join(', ')
      : 'none';

  const contextLines = [
    `Canvas node count: ${context.nodeCount}`,
    `Selected node count: ${context.selectedNodeCount}`,
    `Attached image: ${context.hasImage ? 'yes' : 'no'}`,
    `Grounded local assets: ${assetSummary}`,
  ];

  const taskLine =
    mode === 'plan'
      ? 'Return a short plan with likely next steps and note whether a diagram should be generated next.'
      : 'Return a direct helpful answer. If a diagram might be useful later, say so briefly without generating it.';

  return [`USER REQUEST: ${prompt}`, '', taskLine, '', 'EDITOR CONTEXT:', ...contextLines].join('\n');
}

export function buildFlowpilotDiagramPrompt(
  prompt: string,
  assetMatches: AssetGroundingMatch[]
): string {
  if (assetMatches.length === 0) {
    return prompt;
  }

  const assetHints = assetMatches
    .slice(0, 12)
    .map((match) => {
      const packHint = match.archIconPackId ? `, archIconPackId: "${match.archIconPackId}"` : '';
      const shapeHint = match.archIconShapeId ? `, archIconShapeId: "${match.archIconShapeId}"` : '';
      return `- ${match.label} -> archProvider: "${match.archProvider || match.category}", archResourceType: "${match.archResourceType || 'service'}"${packHint}${shapeHint}`;
    })
    .join('\n');

  return [
    prompt,
    '',
    'LOCAL ASSET GROUNDING:',
    assetHints,
    '',
    'Prefer these grounded assets when they match the user request instead of generic icons.',
  ].join('\n');
}
