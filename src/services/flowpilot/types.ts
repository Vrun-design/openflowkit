import type { DomainLibraryCategory } from '@/services/domainLibrary';

export type AgentResponseMode =
  | 'answer'
  | 'plan'
  | 'asset_suggestions'
  | 'diagram_preview'
  | 'diagram_apply_ready'
  | 'clarification';

export type AgentThinkingState =
  | 'understanding'
  | 'gathering_context'
  | 'searching_assets'
  | 'planning'
  | 'generating'
  | 'ready'
  | 'error';

export type AssistantThreadItemType =
  | 'user_message'
  | 'assistant_thinking'
  | 'assistant_plan'
  | 'assistant_lookup_result'
  | 'assistant_recommendation'
  | 'assistant_canvas_preview'
  | 'assistant_applied_result'
  | 'assistant_error';

export interface AssetGroundingMatch {
  id: string;
  label: string;
  description: string;
  category: DomainLibraryCategory;
  archProvider?: string;
  archResourceType?: string;
  archIconPackId?: string;
  archIconShapeId?: string;
  providerShapeCategory?: string;
  confidence: number;
  reasoning: string;
}

export interface AgentPlan {
  goal: string;
  mode: AgentResponseMode;
  steps: string[];
  requiresApproval: boolean;
  intendedOutput: string;
  confidence: number;
  reasoningSummary: string;
  skillId: FlowpilotSkillId;
}

export type FlowpilotSkillId =
  | 'answer_question'
  | 'plan_diagram'
  | 'create_architecture'
  | 'edit_selected_nodes'
  | 'upgrade_codebase_import'
  | 'suggest_assets'
  | 'explain_existing_diagram';

export interface FlowpilotSkillDefinition {
  id: FlowpilotSkillId;
  label: string;
  outputMode: AgentResponseMode;
  mutatesCanvas: boolean;
  requiredContexts: Array<'canvas' | 'selection' | 'assets' | 'chat_history'>;
  fallbackBehavior: 'ask_clarifying_question' | 'return_plan' | 'return_answer';
}

export interface AssistantThreadItem {
  id: string;
  role: 'user' | 'model';
  type: AssistantThreadItemType;
  content: string;
  createdAt: string;
  responseMode?: AgentResponseMode;
  thinkingState?: AgentThinkingState;
  summary?: string;
  plan?: AgentPlan;
  assetMatches?: AssetGroundingMatch[];
  previewTitle?: string;
  previewDetail?: string;
  previewStats?: string[];
  applied?: boolean;
}

export interface FlowpilotPolicyContext {
  prompt: string;
  nodeCount: number;
  selectedNodeCount: number;
  hasImage?: boolean;
}
