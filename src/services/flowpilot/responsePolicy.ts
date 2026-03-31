import { inferPlanSteps } from './skills';
import type { AgentPlan, AgentResponseMode, FlowpilotPolicyContext, FlowpilotSkillId } from './types';

const EXPLANATION_PATTERNS = [
  /\bexplain\b/i,
  /\bwhat('?s| is) wrong\b/i,
  /\bwhy\b/i,
  /\breview\b/i,
  /\banalyze\b/i,
  /\bcompare\b/i,
];

const PLANNING_PATTERNS = [
  /\bplan\b/i,
  /\bstrategy\b/i,
  /\boptions\b/i,
  /\bbefore drawing\b/i,
  /\boutline\b/i,
];

const ASSET_PATTERNS = [
  /\bicon\b/i,
  /\basset\b/i,
  /\bcomponent\b/i,
  /\bwhich service\b/i,
  /\bwhat should i use\b/i,
];

const DIAGRAM_PATTERNS = [
  /\bdiagram\b/i,
  /\bdraw\b/i,
  /\bgenerate\b/i,
  /\bcreate\b/i,
  /\bshow\b/i,
  /\bmap\b/i,
];

const EDIT_PATTERNS = [/\bchange\b/i, /\bupdate\b/i, /\bedit\b/i, /\brefine\b/i, /\breplace\b/i];

const ARCHITECTURE_PATTERNS = [
  /\barchitecture\b/i,
  /\baws\b/i,
  /\bazure\b/i,
  /\bgcp\b/i,
  /\bkubernetes\b/i,
  /\bcncf\b/i,
  /\binfra\b/i,
  /\bservice\b/i,
];

function matchesAny(prompt: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(prompt));
}

function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(0.98, Math.round(value * 100) / 100));
}

export function chooseFlowpilotResponseMode(
  context: FlowpilotPolicyContext
): {
  mode: AgentResponseMode;
  confidence: number;
  requiresApproval: boolean;
  reasoningSummary: string;
  skillId: FlowpilotSkillId;
} {
  const normalizedPrompt = context.prompt.trim();
  const hasExplanationIntent = matchesAny(normalizedPrompt, EXPLANATION_PATTERNS);
  const hasPlanningIntent = matchesAny(normalizedPrompt, PLANNING_PATTERNS);
  const hasAssetIntent = matchesAny(normalizedPrompt, ASSET_PATTERNS);
  const hasDiagramIntent = matchesAny(normalizedPrompt, DIAGRAM_PATTERNS);
  const hasEditIntent = matchesAny(normalizedPrompt, EDIT_PATTERNS);
  const hasArchitectureIntent = matchesAny(normalizedPrompt, ARCHITECTURE_PATTERNS);

  if (hasAssetIntent && !hasDiagramIntent) {
    return {
      mode: 'asset_suggestions',
      confidence: 0.9,
      requiresApproval: false,
      reasoningSummary: 'The request is asking for asset or component guidance before changing the canvas.',
      skillId: 'suggest_assets',
    };
  }

  if (hasExplanationIntent && context.nodeCount > 0) {
    return {
      mode: 'answer',
      confidence: 0.87,
      requiresApproval: false,
      reasoningSummary: 'The request is asking for analysis of the current diagram rather than a new draft.',
      skillId: 'explain_existing_diagram',
    };
  }

  if (hasPlanningIntent || (!hasDiagramIntent && normalizedPrompt.split(/\s+/).length < 10)) {
    return {
      mode: 'plan',
      confidence: clampConfidence(hasPlanningIntent ? 0.88 : 0.66),
      requiresApproval: false,
      reasoningSummary: 'The request is underspecified or explicitly asks for a plan before drafting.',
      skillId: 'plan_diagram',
    };
  }

  if (context.selectedNodeCount > 0 && hasEditIntent) {
    return {
      mode: 'diagram_preview',
      confidence: 0.9,
      requiresApproval: true,
      reasoningSummary: 'The request is a scoped edit on selected nodes, so a preview is safer than applying directly.',
      skillId: 'edit_selected_nodes',
    };
  }

  if (hasArchitectureIntent || hasDiagramIntent) {
    return {
      mode: 'diagram_preview',
      confidence: clampConfidence(hasArchitectureIntent ? 0.92 : 0.84),
      requiresApproval: true,
      reasoningSummary: hasArchitectureIntent
        ? 'The request is architecture-oriented and should ground itself in provider assets before drafting.'
        : 'The request clearly asks for a diagram draft, so a preview is the right next step.',
      skillId: hasArchitectureIntent ? 'create_architecture' : 'plan_diagram',
    };
  }

  return {
    mode: 'answer',
    confidence: 0.62,
    requiresApproval: false,
    reasoningSummary: 'The safest next step is to answer in chat first instead of changing the canvas.',
    skillId: 'answer_question',
  };
}

export function buildFlowpilotPlan(context: FlowpilotPolicyContext): AgentPlan {
  const policy = chooseFlowpilotResponseMode(context);
  const intendedOutput =
    policy.mode === 'diagram_preview'
      ? 'Canvas preview with review/apply controls'
      : policy.mode === 'asset_suggestions'
        ? 'Recommended local asset matches'
        : policy.mode === 'plan'
          ? 'Structured plan and next-step options'
          : 'Chat response';

  return {
    goal: context.prompt.trim(),
    mode: policy.mode,
    steps: inferPlanSteps(policy.skillId, context),
    requiresApproval: policy.requiresApproval,
    intendedOutput,
    confidence: policy.confidence,
    reasoningSummary: policy.reasoningSummary,
    skillId: policy.skillId,
  };
}
