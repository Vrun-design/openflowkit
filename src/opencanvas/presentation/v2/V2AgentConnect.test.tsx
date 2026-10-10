import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { claudeCodeCommand, V2AgentConnect, type V2AgentConnectProps } from './V2AgentConnect';
import { TOKEN_REJECTED } from './useV2AgentBridge';

const base: V2AgentConnectProps = {
  status: 'off', detail: '', port: 43119, token: 'tok', activity: null,
  onPortChange: vi.fn(), onTokenChange: vi.fn(), onToggle: vi.fn(), onClose: vi.fn(),
};

describe('V2AgentConnect', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers a Claude Code one-liner carrying the token (and the port when it is not the default)', async () => {
    expect(claudeCodeCommand(43119, 'tok')).toBe('claude mcp add openflowkit -e OPENFLOWKIT_BRIDGE_TOKEN=tok -- npx -y @vrun-design/openflowkit-mcp');
    expect(claudeCodeCommand(5000, '')).toBe('claude mcp add openflowkit -e OPENFLOWKIT_BRIDGE_PORT=5000 -- npx -y @vrun-design/openflowkit-mcp');
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<V2AgentConnect {...base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy Claude Code command' }));
    expect(writeText).toHaveBeenCalledWith(claudeCodeCommand(43119, 'tok'));
  });

  it('does not promise a review MCP edits never get', () => {
    render(<V2AgentConnect {...base} />);
    expect(screen.queryByText(/review every change/)).toBeNull();
    expect(screen.getByText(/each change is one undo step/)).toBeTruthy();
  });

  it('a rejected token shows only its own fix, not the start-the-server advice', () => {
    const { rerender } = render(<V2AgentConnect {...base} status="error" detail={TOKEN_REJECTED} />);
    expect(screen.getByRole('alert').textContent).toBe(TOKEN_REJECTED);
    rerender(<V2AgentConnect {...base} status="error" detail="Nothing is listening on 127.0.0.1:43119." />);
    expect(screen.getByRole('alert').textContent).toMatch(/Start the MCP server/);
  });

  it('shows the last agent change with its undo while connected', () => {
    const onUndo = vi.fn();
    render(<V2AgentConnect {...base} status="connected" activity="Style 2 shapes" onUndo={onUndo} />);
    expect(screen.getByText('Agent: Style 2 shapes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
