// "Connect agent" popover: pairs this editor with a local MCP server over the
// long-poll bridge. Shows the live status and the exact MCP config snippet.
import { useState } from 'react';
import { IconCopy, IconPlugConnected, IconPlugOff } from '@tabler/icons-react';
import { Button, Icon, Popover, PopoverHeader, Segmented } from '../design-system';
import type { V2BridgeStatus } from './useV2AgentBridge';

export interface V2AgentConnectProps {
  readonly open: boolean;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly status: V2BridgeStatus;
  readonly detail: string;
  readonly port: number;
  readonly token: string;
  readonly onPortChange: (port: number) => void;
  readonly onTokenChange: (token: string) => void;
  readonly onToggle: (connect: boolean) => void;
  readonly onClose: () => void;
}

/** The connect state a surrounding bar owns; the popover chrome is local. */
export type V2AgentConnectModel = Omit<V2AgentConnectProps, 'open' | 'anchorRef' | 'onClose'>;

const STATUS_TEXT: Readonly<Record<V2BridgeStatus, string>> = {
  off: 'Not connected. Start the MCP server, then connect.',
  connecting: 'Connecting to the local bridge…',
  connected: 'Agent connected. Tools act on the document you see.',
  error: 'Bridge unreachable. Is the MCP server running on this port?',
};

export function V2AgentConnect(props: V2AgentConnectProps) {
  const [draftPort, setDraftPort] = useState(String(props.port));
  const [draftToken, setDraftToken] = useState(props.token);
  const connected = props.status === 'connected';
  const port = Number(draftPort);
  const validPort = Number.isInteger(port) && port > 0 && port < 65536;

  return (
    <Popover role="dialog" aria-label="Connect agent" open={props.open} anchorRef={props.anchorRef}
      onClose={props.onClose} placement="bottom-start">
      <PopoverHeader title="Connect agent" close={<Button variant="quiet" onClick={props.onClose}>Done</Button>} />
      <div className="ofk-v2-properties ofk-v2-bridge">
        <p className="ofk-caption" data-status={props.status}>{STATUS_TEXT[props.status]}</p>
        <label className="ofk-caption" htmlFor="ofk-bridge-port">Bridge port</label>
        <input id="ofk-bridge-port" className="ofk-v2-bridge-input" inputMode="numeric" value={draftPort}
          disabled={connected} onChange={(event) => setDraftPort(event.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => { if (validPort) props.onPortChange(port); else setDraftPort(String(props.port)); }} />
        <label className="ofk-caption" htmlFor="ofk-bridge-token">Token (optional)</label>
        <input id="ofk-bridge-token" className="ofk-v2-bridge-input" value={draftToken} disabled={connected}
          placeholder="Only if the server sets OPENFLOWKIT_BRIDGE_TOKEN"
          onChange={(event) => setDraftToken(event.target.value)}
          onBlur={() => props.onTokenChange(draftToken.trim())} />
        <Segmented<'on' | 'off'> label="Bridge" value={connected ? 'on' : 'off'}
          onChange={(value) => props.onToggle(value === 'on')}
          options={[{ value: 'off', label: 'Disconnected' }, { value: 'on', label: 'Connected' }]} />
        {props.detail ? <p className="ofk-caption">{props.detail}</p> : null}
        <p className="ofk-caption">Point any MCP client at the server and it will find this editor:</p>
        <pre className="ofk-v2-bridge-snippet">{`{\n  "mcpServers": {\n    "openflowkit": { "command": "npx",\n      "args": ["-y", "@vrun-design/openflowkit-mcp"] }\n  }\n}`}</pre>
        <Button variant="quiet" onClick={() => { void navigator.clipboard.writeText(JSON.stringify({ mcpServers: { openflowkit: { command: 'npx', args: ['-y', '@vrun-design/openflowkit-mcp'] } } }, null, 2)); }}>
          <Icon icon={IconCopy} /> Copy config
        </Button>
      </div>
    </Popover>
  );
}

export const AgentPlugIcon = { connected: IconPlugConnected, off: IconPlugOff };
