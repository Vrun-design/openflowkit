import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import {
  buildIdMap,
  parseDslOrThrow,
  toErrorMessage,
  toFinalEdges,
  toFinalNodes,
} from './graphComposer';

vi.mock('@/lib/openFlowDSLParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/openFlowDSLParser')>();
  return {
    ...actual,
    parseOpenFlowDSL: vi.fn(),
  };
});

function createNode(id: string, label: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label, color: 'slate', shape: 'rounded' },
  };
}

describe('graphComposer', () => {
  it('parses fenced DSL and throws parser errors', () => {
    vi.mocked(parseOpenFlowDSL).mockReturnValueOnce({
      nodes: [createNode('n1', 'Node 1')],
      edges: [],
    });

    expect(parseDslOrThrow('```flowmind\nflow: "Test"\n```')).toEqual({
      nodes: [createNode('n1', 'Node 1')],
      edges: [],
    });

    vi.mocked(parseOpenFlowDSL).mockReturnValueOnce({
      nodes: [],
      edges: [],
      error: 'Line 1: Invalid DSL',
    });

    expect(() => parseDslOrThrow('broken')).toThrow('Line 1: Invalid DSL');
  });

  it('reuses ids by matching labels and normalizes final nodes', () => {
    const parsedNodes = [createNode('generated-1', 'Billing Service')];
    const existingNodes = [createNode('existing-1', 'Billing Service')];
    const idMap = buildIdMap(parsedNodes, existingNodes);

    expect(idMap.get('generated-1')).toBe('existing-1');
    expect(toFinalNodes(parsedNodes, idMap)[0].id).toBe('existing-1');
  });

  it('normalizes final edges with global edge options and skips missing-node edges', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const finalEdges = toFinalEdges(
      [
        { id: 'e1', source: 'a', target: 'b', type: 'default' } as FlowEdge,
        { id: 'e2', source: 'missing', target: 'b' } as FlowEdge,
      ],
      new Map([
        ['a', 'node-a'],
        ['b', 'node-b'],
      ]),
      {
        type: 'smoothstep',
        animated: true,
        strokeWidth: 4,
        color: '#123456',
      }
    );

    expect(finalEdges).toHaveLength(1);
    expect(finalEdges[0].source).toBe('node-a');
    expect(finalEdges[0].target).toBe('node-b');
    expect(finalEdges[0].animated).toBe(true);
    expect(finalEdges[0].style?.strokeWidth).toBe(4);
    expect(finalEdges[0].style?.stroke).toBe('#123456');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('maps a raw model-not-found response to a user-friendly message', () => {
    const rawError =
      'models/gemini-3-pro is not found for API version v1beta, or is not supported for generateContent. Service: generativelanguage.googleapis.com (404)';
    const message = toErrorMessage(new Error(rawError));

    expect(message).toBe(
      'The selected AI model is unavailable or no longer supported. Please select another model and try again.'
    );
    expect(message).not.toContain('generativelanguage.googleapis.com');
  });

  it.each([
    ['INVALID API KEY', 'Invalid or missing API key. Please check your AI settings.'],
    ['Request failed with status 403', 'Access forbidden. Please check your API key permissions.'],
    ['Quota exceeded', 'Rate limit exceeded. Please wait a moment and try again.'],
    ['Provider returned 503', 'AI provider server error. Please try again later.'],
    ['Failed to fetch', 'Network error. Please check your internet connection.'],
  ])('maps %s without exposing provider details', (rawError, expectedMessage) => {
    expect(toErrorMessage(new Error(rawError))).toBe(expectedMessage);
  });

  it('does not expose unknown error details', () => {
    const expectedMessage = 'The AI request failed. Please try again or choose a different model.';

    expect(toErrorMessage(new Error('upstream service secret detail'))).toBe(expectedMessage);
    expect(toErrorMessage('raw provider response')).toBe(expectedMessage);
    expect(toErrorMessage('')).toBe(expectedMessage);
  });
});
