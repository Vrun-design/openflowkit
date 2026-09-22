import { useState } from 'react';
import {
  IconBrush, IconCamera, IconCheck, IconChevronDown, IconCopy, IconDownload, IconEye, IconPencil, IconPhotoSearch,
  IconPlugConnected, IconTerminal2,
} from '@tabler/icons-react';
import { Button, Icon, Panel } from '../design-system';
import type { V2BridgeStatus } from './useV2AgentBridge';

export interface V2AgentConnectModel {
  readonly status: V2BridgeStatus;
  readonly detail: string;
  readonly port: number;
  readonly token: string;
  readonly onPortChange: (port: number) => void;
  readonly onTokenChange: (token: string) => void;
  readonly onToggle: (connect: boolean) => void;
}
export interface V2AgentConnectProps extends V2AgentConnectModel { readonly onClose: () => void; }

const STATUS_LABEL: Record<V2BridgeStatus, string> = { off: 'Not connected', connecting: 'Connecting…', connected: 'Connected', error: 'Connection unavailable' };
const CAPABILITIES = [
  { icon: IconEye, title: 'Read', text: 'Every page, shape and connector as structured data.' },
  { icon: IconPencil, title: 'Draw', text: 'Generate or update a diagram from the OpenFlow DSL.' },
  { icon: IconBrush, title: 'Style', text: 'Move, recolour and restyle what is already on the canvas.' },
  { icon: IconPhotoSearch, title: 'Icons', text: 'Search the icon library and place the right one.' },
  { icon: IconCamera, title: 'See', text: 'Take a screenshot to check its own work.' },
  { icon: IconDownload, title: 'Export', text: 'Hand you PNG, SVG or JSON when it is done.' },
] as const;

/** Rail panel for the MCP bridge: onboarding when off, a live status card when an agent is on. */
export function V2AgentConnect(props: V2AgentConnectProps) {
  const [draftPort, setDraftPort] = useState(String(props.port));
  const [draftToken, setDraftToken] = useState(props.token);
  const [copyStatus, setCopyStatus] = useState('');
  const connected = props.status === 'connected';
  const running = props.status !== 'off';
  const port = Number(draftPort);
  const validPort = Number.isInteger(port) && port > 0 && port < 65536;
  const config = JSON.stringify({ mcpServers: { openflowkit: {
    command: 'npx', args: ['-y', '@vrun-design/openflowkit-mcp'],
    ...(props.port !== 43119 ? { env: { OPENFLOWKIT_BRIDGE_PORT: String(props.port) } } : {}),
  } } }, null, 2);
  async function copyConfig(): Promise<void> {
    try { await navigator.clipboard.writeText(config); setCopyStatus('Copied'); }
    catch { setCopyStatus('Could not copy. Select the config below.'); }
  }
  return <Panel title="Connect agent" onClose={props.onClose} closeLabel="Close agent connection"
    className="ofk-v2-workspace-panel ofk-connection-panel" data-status={props.status}
    tools={<span className="ofk-connection-badge"><span className="ofk-connection-dot" />{STATUS_LABEL[props.status]}</span>}>
    <div className="ofk-connection-hero" aria-hidden="true">
      <span className="ofk-connection-hero-node"><Icon icon={IconTerminal2} />Agent</span>
      <span className="ofk-connection-hero-link"><i /><i /><i /></span>
      <span className="ofk-connection-hero-node ofk-connection-hero-canvas"><img src="/Logo_openflowkit.svg" width="16" height="16" alt="" />Canvas</span>
    </div>
    {connected ? <>
      <h3>Your agent is on the canvas.</h3>
      <p className="ofk-connection-lede">Everything it draws lands here as one undo step, like any edit of your own.</p>
      <div className="ofk-connection-summary">
        <span className="ofk-connection-mark"><Icon icon={IconPlugConnected} /></span>
        <div><strong>Live over MCP</strong><span className="ofk-connection-endpoint">127.0.0.1:{props.port}</span></div>
        <Button variant="quiet" onClick={() => props.onToggle(false)}>Disconnect</Button>
      </div>
      <h4 className="ofk-connection-heading">What your agent can do</h4>
      <ul className="ofk-connection-capabilities">
        {CAPABILITIES.map(({ icon, title, text }) => <li key={title}><Icon icon={icon} /><strong>{title}</strong><span>{text}</span></li>)}
      </ul>
    </> : <>
      <h3>Your agent, on your canvas.</h3>
      <p className="ofk-connection-lede">Claude Code, Cursor or any MCP client can read this document and draw on it — you review every change.</p>
      {props.status === 'error' ? <p role="alert" className="ofk-connection-error">Start the MCP server, then check the connection settings. Retrying automatically.</p> : null}
      <ol className="ofk-connection-steps">
        <li><span>1</span><div><strong>Add OpenFlowKit to your MCP client</strong>
          <Button onClick={() => { void copyConfig(); }}><Icon icon={copyStatus === 'Copied' ? IconCheck : IconCopy} />{copyStatus === 'Copied' ? 'Config copied' : 'Copy MCP configuration'}</Button></div></li>
        <li><span>2</span><div><strong>Start the server, then connect</strong>
          <Button variant="primary" disabled={running || !validPort} onClick={() => props.onToggle(true)}>
            <Icon icon={IconPlugConnected} />{running ? 'Connecting…' : 'Connect'}
          </Button>
          {running ? <Button variant="quiet" onClick={() => props.onToggle(false)}>Cancel</Button> : null}</div></li>
      </ol>
    </>}
    <details className="ofk-connection-details"><summary>Connection settings<Icon icon={IconChevronDown} /></summary>
      <div className="ofk-connection-fields">
        <label htmlFor="ofk-bridge-port">Port<input id="ofk-bridge-port" className="ofk-v2-bridge-input" inputMode="numeric" value={draftPort}
          disabled={running} aria-invalid={!validPort || undefined} onChange={(event) => setDraftPort(event.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => { if (validPort) props.onPortChange(port); }} /></label>
        <label htmlFor="ofk-bridge-token">Token <span>optional</span><input id="ofk-bridge-token" type="password" autoComplete="off" className="ofk-v2-bridge-input"
          value={draftToken} disabled={running} placeholder="Server token" onChange={(event) => setDraftToken(event.target.value)}
          onBlur={() => props.onTokenChange(draftToken.trim())} /></label>
      </div>
      {!validPort ? <p role="alert" className="ofk-connection-error">Use a port between 1 and 65535.</p> : null}
      <p>Disconnect to change settings.</p>
    </details>
    <details className="ofk-connection-details"><summary>MCP configuration<Icon icon={IconChevronDown} /></summary>
      <pre className="ofk-v2-bridge-snippet">{config}</pre>
      <Button variant="quiet" onClick={() => { void copyConfig(); }}><Icon icon={IconCopy} />Copy config</Button>
    </details>
    {copyStatus ? <span className="ofk-copy-feedback" role="status">{copyStatus}</span> : null}
  </Panel>;
}
