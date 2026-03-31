import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/services/aiService';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import { generateDiagramFromChat } from '@/services/aiService';
import { serializeCanvasContextForAI } from '@/services/ai/contextSerializer';
import {
  appendChatExchange,
  buildUserChatMessage,
  generateAIFlowResult,
} from './requestLifecycle';

vi.mock('@/services/ai/contextSerializer', () => ({
  serializeCanvasContextForAI: vi.fn(() => '# Current diagram\nflow: Test\ndirection: TB'),
}));

vi.mock('@/services/aiService', () => ({
  generateDiagramFromChat: vi.fn(),
}));

vi.mock('@/services/composeDiagramForDisplay', () => ({
  composeDiagramForDisplay: vi.fn(async (nodes, edges) => ({ nodes, edges })),
}));

vi.mock('./graphComposer', () => ({
  parseDslOrThrow: vi.fn(() => ({
    nodes: [{ id: 'generated-a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } }],
    edges: [{ id: 'edge-a', source: 'generated-a', target: 'generated-a' }],
  })),
  buildIdMap: vi.fn(() => new Map([['generated-a', 'existing-a']])),
  toFinalNodes: vi.fn(() => [{ id: 'existing-a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } }]),
  toFinalEdges: vi.fn(() => [{ id: 'edge-final', source: 'existing-a', target: 'existing-a' }]),
}));

const BASE_AI_SETTINGS = { provider: 'gemini' as const, storageMode: 'local' as const, apiKey: 'key', model: 'model' };
const BASE_EDGE_OPTIONS = { type: 'smoothstep' as const, animated: false, strokeWidth: 2 };

describe('requestLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('builds and appends chat messages consistently', () => {
    const userMessage = buildUserChatMessage('Create billing flow', 'base64');
    expect(userMessage).toEqual({
      role: 'user',
      parts: [{ text: 'Create billing flow [Image Attached]' }],
    });

    const history: ChatMessage[] = [{ role: 'user', parts: [{ text: 'Old' }] }];
    expect(appendChatExchange(history, userMessage, 'flow: "A"')).toEqual([
      ...history,
      userMessage,
      { role: 'model', parts: [{ text: 'flow: "A"' }] },
    ]);
  });

  it('runs full layout on an empty canvas (fresh generation)', async () => {
    vi.mocked(generateDiagramFromChat).mockResolvedValueOnce('flow: "A"');

    const result = await generateAIFlowResult({
      chatMessages: [],
      prompt: 'Create billing flow',
      nodes: [],
      edges: [],
      aiSettings: BASE_AI_SETTINGS,
      globalEdgeOptions: BASE_EDGE_OPTIONS,
    });

    expect(generateDiagramFromChat).toHaveBeenCalled();
    expect(composeDiagramForDisplay).toHaveBeenCalled();
    expect(result.userMessage.role).toBe('user');
    expect(result.dslText).toBe('flow: "A"');
  });

  it('uses seeded native dsl as edit context on an empty canvas', async () => {
    vi.mocked(generateDiagramFromChat).mockResolvedValueOnce('flow: "A"');
    vi.mocked(serializeCanvasContextForAI).mockReturnValueOnce('');

    await generateAIFlowResult({
      chatMessages: [],
      prompt: 'Enhance this repository diagram',
      seedDsl: 'flow: "Repository Module Structure"\ndirection: TB\n[system] api: API { color: "violet", subLabel: "API layer" }',
      nodes: [],
      edges: [],
      aiSettings: BASE_AI_SETTINGS,
      globalEdgeOptions: BASE_EDGE_OPTIONS,
    });

    expect(vi.mocked(generateDiagramFromChat).mock.calls[0][2]).toContain('Repository Module Structure');
  });

  it('skips layout when all AI nodes are matched (pure edit — positions preserved)', async () => {
    vi.mocked(generateDiagramFromChat).mockResolvedValueOnce('flow: "A"');

    const result = await generateAIFlowResult({
      chatMessages: [],
      prompt: 'Make the Login node blue',
      nodes: [{ id: 'existing-a', type: 'process', position: { x: 100, y: 200 }, data: { label: 'A' } }],
      edges: [],
      aiSettings: BASE_AI_SETTINGS,
      globalEdgeOptions: BASE_EDGE_OPTIONS,
    });

    // No new nodes → layout skipped, existing position preserved
    expect(composeDiagramForDisplay).not.toHaveBeenCalled();
    expect(result.layoutedNodes[0].id).toBe('existing-a');
    expect(result.layoutedNodes[0].position).toEqual({ x: 100, y: 200 });
    expect(result.layoutedEdges[0].id).toBe('edge-final');
  });

  it('appends selection suffix to prompt when nodes are selected', async () => {
    vi.mocked(generateDiagramFromChat).mockResolvedValueOnce('flow: "A"');

    await generateAIFlowResult({
      chatMessages: [],
      prompt: 'Make it blue',
      nodes: [{ id: 'existing-a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Login' } }],
      edges: [],
      selectedNodeIds: ['existing-a'],
      aiSettings: BASE_AI_SETTINGS,
      globalEdgeOptions: BASE_EDGE_OPTIONS,
    });

    const calledPrompt = vi.mocked(generateDiagramFromChat).mock.calls[0][1];
    expect(calledPrompt).toContain('FOCUSED EDIT');
    expect(calledPrompt).toContain('Login');
  });
});
