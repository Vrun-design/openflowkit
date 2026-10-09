import {
  IconCode,
  IconKeyboard,
  IconPlugConnected,
  IconSitemap,
  IconSparkles,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import {
  Button,
  FloatingRegion,
  Icon,
  IconButton,
  Kbd,
  Panel,
  Toolbar,
  Tooltip,
} from '../design-system';
import { shortcutGroups } from './v2Shortcuts';

export type V2WorkspaceMode = 'assistant' | 'code' | 'model' | 'agent' | 'inspect';
const MODES = [
  { id: 'assistant', label: 'AI assistant', icon: IconSparkles },
  { id: 'model', label: 'Architecture model', icon: IconSitemap },
  { id: 'code', label: 'Diagram as code', icon: IconCode },
  { id: 'agent', label: 'Connect agent', icon: IconPlugConnected },
] as const;

/** The document bar's pair at the right edge: the same top line, the workspace rail hangs below it. */
export function V2ShareBar({ canShare, shareOpen, exportOpen, onShare, onExport }: {
  canShare: boolean;
  shareOpen: boolean;
  exportOpen: boolean;
  onShare: (anchor: HTMLElement) => void;
  onExport: (anchor: HTMLElement) => void;
}) {
  return (
    <FloatingRegion slot="top-end" className="ofk-v2-share-bar">
      <Toolbar label="Share and export">
        {canShare ? (
          <Button variant="quiet" aria-haspopup="dialog" aria-expanded={shareOpen}
            onClick={(event) => onShare(event.currentTarget)}>
            Share
          </Button>
        ) : null}
        <Button variant="primary" aria-haspopup="dialog" aria-expanded={exportOpen}
          onClick={(event) => onExport(event.currentTarget)}>
          Export
        </Button>
      </Toolbar>
    </FloatingRegion>
  );
}

export function V2WorkspaceRail({
  mode,
  onChange,
  onShortcuts,
  agentConnected,
}: {
  mode: V2WorkspaceMode | null;
  onChange: (mode: V2WorkspaceMode) => void;
  onShortcuts: () => void;
  agentConnected: boolean;
}) {
  return (
    <>
      <FloatingRegion slot="top-end" className="ofk-v2-workspace-rail">
        <Toolbar label="Workspace" orientation="vertical">
          {MODES.map(({ id, label, icon }) => (
            <Tooltip key={id} content={label}>
              <IconButton
                variant="quiet"
                label={label}
                icon={<Icon icon={icon} />}
                selected={mode === id}
                aria-expanded={mode === id}
                data-live={(id === 'agent' && agentConnected) || undefined}
                data-bridge-status={id === 'agent' ? agentConnected ? 'connected' : 'disconnected' : undefined}
                onClick={() => onChange(id)}
              />
            </Tooltip>
          ))}
        </Toolbar>
      </FloatingRegion>
      <FloatingRegion slot="bottom-end" className="ofk-v2-help">
        <Toolbar label="Help">
          <Tooltip content="Keyboard shortcuts" shortcut="?">
            <IconButton
              variant="quiet"
              label="Keyboard shortcuts"
              icon={<Icon icon={IconKeyboard} />}
              onClick={onShortcuts}
            />
          </Tooltip>
        </Toolbar>
      </FloatingRegion>
    </>
  );
}

/** The centred welcome Canvas and Map share, so switching between them changes only the words and buttons: logo, title, one line, a row of actions, and the arrows pointing at the chrome. */
export function V2Welcome({ testId, title, body, actions }: {
  testId: string;
  title: string;
  body: string;
  actions: ReactNode;
}) {
  return (
    <div className="ofk-v2-welcome" data-testid={testId}>
      <div className="ofk-v2-guide ofk-v2-guide-tools" aria-hidden="true">
        <svg viewBox="0 0 110 70"><path d="M103 9 C76 11 47 29 9 59 M11 44 Q7 54 9 60 Q20 60 29 55" /></svg><span>Start with a shape</span>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-workspace" aria-hidden="true">
        <span>Another way to create</span><svg viewBox="0 0 120 80"><path d="M8 72 C30 43 67 13 111 13 M99 5 Q108 8 112 13 Q108 20 100 23" /></svg>
      </div>
      <div className="ofk-v2-welcome-center">
        <img src="/Logo_openflowkit.svg" alt="OpenFlowKit" width="48" height="48" />
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="ofk-v2-welcome-actions">{actions}</div>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-view" aria-hidden="true">
        <svg viewBox="0 0 110 100"><path d="M102 9 C58 12 25 43 17 89 M8 74 Q12 86 17 91 Q25 85 31 76" /></svg>
        <span>Canvas, layers &amp; view</span>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-help" aria-hidden="true"><span>Keyboard shortcuts</span><svg viewBox="0 0 110 100"><path d="M8 9 C53 8 84 42 94 89 M82 78 Q90 87 95 91 Q101 82 102 73" /></svg></div>
    </div>
  );
}

export function V2CanvasWelcome({ onOpen }: { onOpen: (mode: V2WorkspaceMode) => void }) {
  return (
    <V2Welcome
      testId="v2-welcome"
      title="Make room for your next idea."
      body="Double-click anywhere to add text, or start with a shape."
      actions={MODES.filter(({ id }) => id !== 'model').map(({ id, label, icon }) => (
        <Button key={id} variant="secondary" onClick={() => onOpen(id)}>
          <Icon icon={icon} />
          {label}
        </Button>
      ))}
    />
  );
}

export const INITIAL_CODE =
  '%% ofk 1\narchitecture\ntitle: My first diagram\n\nClient\nAPI\nDatabase [cylinder]\n\nClient -> API : request\nAPI -> Database : query';

export function V2Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Keyboard shortcuts" onClose={onClose} className="ofk-v2-workspace-panel">
      <p className="ofk-v2-muted">Less reaching. More creating.</p>
      {shortcutGroups().map(({ title, rows }) => (
        <section className="ofk-v2-shortcut-group" key={title}>
          <h3>{title}</h3>
          {rows.map(({ label, keys }) => (
            <div key={label}>
              <span>{label}</span>
              <Kbd keys={keys} />
            </div>
          ))}
        </section>
      ))}
    </Panel>
  );
}
