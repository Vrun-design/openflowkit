import type {
  AgentPlan,
  FlowpilotPolicyContext,
  FlowpilotSkillDefinition,
  FlowpilotSkillId,
} from './types';

export const FLOWPILOT_SKILLS: Record<FlowpilotSkillId, FlowpilotSkillDefinition> = {
  answer_question: {
    id: 'answer_question',
    label: 'Answer question',
    outputMode: 'answer',
    mutatesCanvas: false,
    requiredContexts: ['canvas', 'chat_history'],
    fallbackBehavior: 'return_answer',
  },
  plan_diagram: {
    id: 'plan_diagram',
    label: 'Plan diagram',
    outputMode: 'plan',
    mutatesCanvas: false,
    requiredContexts: ['canvas', 'chat_history'],
    fallbackBehavior: 'return_plan',
  },
  create_architecture: {
    id: 'create_architecture',
    label: 'Create architecture',
    outputMode: 'diagram_preview',
    mutatesCanvas: true,
    requiredContexts: ['canvas', 'assets', 'chat_history'],
    fallbackBehavior: 'return_plan',
  },
  edit_selected_nodes: {
    id: 'edit_selected_nodes',
    label: 'Edit selected nodes',
    outputMode: 'diagram_preview',
    mutatesCanvas: true,
    requiredContexts: ['canvas', 'selection', 'chat_history'],
    fallbackBehavior: 'ask_clarifying_question',
  },
  upgrade_codebase_import: {
    id: 'upgrade_codebase_import',
    label: 'Upgrade codebase import',
    outputMode: 'diagram_preview',
    mutatesCanvas: true,
    requiredContexts: ['canvas', 'assets', 'chat_history'],
    fallbackBehavior: 'return_plan',
  },
  suggest_assets: {
    id: 'suggest_assets',
    label: 'Suggest assets',
    outputMode: 'asset_suggestions',
    mutatesCanvas: false,
    requiredContexts: ['assets', 'canvas'],
    fallbackBehavior: 'return_answer',
  },
  explain_existing_diagram: {
    id: 'explain_existing_diagram',
    label: 'Explain existing diagram',
    outputMode: 'answer',
    mutatesCanvas: false,
    requiredContexts: ['canvas', 'chat_history'],
    fallbackBehavior: 'return_answer',
  },
};

export function getFlowpilotSkillDefinition(skillId: FlowpilotSkillId): FlowpilotSkillDefinition {
  return FLOWPILOT_SKILLS[skillId];
}

export function inferPlanSteps(
  skillId: FlowpilotSkillId,
  context: Pick<FlowpilotPolicyContext, 'selectedNodeCount' | 'nodeCount'>
): string[] {
  switch (skillId) {
    case 'answer_question':
      return ['Inspect the current canvas context', 'Draft a concise answer'];
    case 'plan_diagram':
      return ['Inspect the current canvas context', 'Outline the recommended structure'];
    case 'create_architecture':
      return ['Inspect canvas context', 'Look for provider-backed assets', 'Draft a diagram preview'];
    case 'edit_selected_nodes':
      return [
        `Inspect the ${context.selectedNodeCount || 1} selected node${context.selectedNodeCount === 1 ? '' : 's'}`,
        'Plan the scoped edit',
        'Prepare a diagram preview',
      ];
    case 'upgrade_codebase_import':
      return ['Inspect imported structure', 'Ground platform services', 'Prepare an upgraded preview'];
    case 'suggest_assets':
      return ['Search the local asset libraries', 'Rank the best matches'];
    case 'explain_existing_diagram':
      return ['Inspect the current diagram', 'Explain strengths, risks, and missing pieces'];
    default:
      return ['Inspect the current request', 'Draft the response'];
  }
}

export function getFlowpilotSkillLabel(plan: AgentPlan): string {
  return FLOWPILOT_SKILLS[plan.skillId].label;
}
