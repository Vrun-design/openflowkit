import { describe, expect, it } from 'vitest';
import { buildFlowpilotPlan, chooseFlowpilotResponseMode } from './responsePolicy';

describe('flowpilot response policy', () => {
  it('selects answer mode for explanatory prompts', () => {
    const result = chooseFlowpilotResponseMode({
      prompt: "Explain what's wrong with this architecture",
      nodeCount: 8,
      selectedNodeCount: 0,
    });

    expect(result.mode).toBe('answer');
    expect(result.skillId).toBe('explain_existing_diagram');
  });

  it('selects plan mode for planning prompts', () => {
    const plan = buildFlowpilotPlan({
      prompt: 'Plan a better version before drawing it',
      nodeCount: 5,
      selectedNodeCount: 0,
    });

    expect(plan.mode).toBe('plan');
    expect(plan.steps.length).toBeGreaterThan(1);
  });

  it('selects preview mode for explicit architecture creation', () => {
    const result = chooseFlowpilotResponseMode({
      prompt: 'Create an AWS architecture diagram for a payments platform',
      nodeCount: 0,
      selectedNodeCount: 0,
    });

    expect(result.mode).toBe('diagram_preview');
    expect(result.requiresApproval).toBe(true);
  });
});
