import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/services/aiService';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import { generateDiagramFromChat } from '@/services/aiService';
import {
  appendChatExchange,
  buildUserChatMessage,
  generateAIFlowResult,
} from './requestLifecycle';

vi.mock('@/services/ai/contextSerializer', () => ({
  serializeCanvasContextForAI: vi.fn(() => '{"nodes":[],"edges":[]}'),
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

describe('requestLifecycle', () => {
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

  it('runs the AI generation pipeline and returns composed graph output', async () => {
    vi.mocked(generateDiagramFromChat).mockResolvedValueOnce('flow: "A"');

    const result = await generateAIFlowResult({
      chatMessages: [],
      prompt: 'Create billing flow',
      imageBase64: undefined,
      nodes: [{ id: 'existing-a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } }],
      edges: [],
      aiSettings: {
        provider: 'gemini',
        apiKey: 'key',
        model: 'model',
      },
      globalEdgeOptions: {
        type: 'smoothstep',
        animated: false,
        strokeWidth: 2,
      },
    });

    expect(generateDiagramFromChat).toHaveBeenCalled();
    expect(composeDiagramForDisplay).toHaveBeenCalled();
    expect(result.userMessage.role).toBe('user');
    expect(result.dslText).toBe('flow: "A"');
    expect(result.layoutedNodes[0].id).toBe('existing-a');
    expect(result.layoutedEdges[0].id).toBe('edge-final');
  });
});
