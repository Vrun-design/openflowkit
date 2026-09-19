import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowTab } from '@/lib/types';
import { useFlowStore } from '@/store';
import { AGENT_ACTIONS } from './actions';
import { runAgentActionInStore } from './runInStore';
import { isWebMcpAvailable, registerAgentActionsWithBrowser } from './webmcp';

beforeEach(() => {
  const tab: FlowTab = {
    id: 'page-1', name: 'Page 1', diagramType: 'flowchart', nodes: [], edges: [],
    history: { past: [], future: [] },
  };
  useFlowStore.setState({
    nodes: [], edges: [], tabs: [tab], activeTabId: tab.id,
    documents: [{ id: 'doc', name: 'Doc', tabs: [tab], activeTabId: tab.id }] as never,
    activeDocumentId: 'doc',
  });
});

afterEach(() => {
  delete (navigator as Navigator & { modelContext?: unknown }).modelContext;
});

describe('runAgentActionInStore', () => {
  it('edits the live store with history', () => {
    const before = useFlowStore.getState().nodes.length;
    const output = runAgentActionInStore('add_node', { label: 'Agent node', id: 'agent-1' });
    expect(output).toEqual({ id: 'agent-1' });
    expect(useFlowStore.getState().nodes.map(({ id }) => id)).toContain('agent-1');
    useFlowStore.getState().undoV2();
    expect(useFlowStore.getState().nodes.length).toBe(before);
  });

  it('rejects unknown actions and invalid input before touching the store', () => {
    expect(() => runAgentActionInStore('nope', {})).toThrow(/not found/);
    expect(() => runAgentActionInStore('add_node', { label: '' })).toThrow();
  });
});

describe('registerAgentActionsWithBrowser', () => {
  it('is a no-op without navigator.modelContext', () => {
    expect(isWebMcpAvailable()).toBe(false);
    expect(registerAgentActionsWithBrowser()).toBeTypeOf('function');
  });

  it('registers every action as a WebMCP tool and executes through the store', async () => {
    const registerTool = vi.fn();
    const unregisterTool = vi.fn();
    (navigator as Navigator & { modelContext?: unknown }).modelContext = { registerTool, unregisterTool };
    const unregister = registerAgentActionsWithBrowser();
    expect(registerTool).toHaveBeenCalledTimes(AGENT_ACTIONS.length);
    const tool = registerTool.mock.calls.find(([candidate]) => candidate.name === 'get_document')![0];
    expect(tool.inputSchema).toMatchObject({ type: 'object' });
    const result = await tool.execute({});
    expect(JSON.parse(result.content[0].text)).toHaveProperty('nodes');
    unregister();
    expect(unregisterTool).toHaveBeenCalledTimes(AGENT_ACTIONS.length);
  });
});
