import {
  IconCode,
  IconKeyboard,
  IconPlugConnected,
  IconSitemap,
  IconSparkles,
} from '@tabler/icons-react';
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
import { STARTER_TEMPLATES, type StarterTemplate } from '../../../agent/starterTemplates';
import { shortcutGroups } from './v2Shortcuts';

export type V2WorkspaceMode = 'assistant' | 'code' | 'model' | 'agent' | 'inspect';
const MODES = [
  { id: 'assistant', label: 'AI assistant', icon: IconSparkles },
  { id: 'model', label: 'Architecture model', icon: IconSitemap },
  { id: 'code', label: 'Diagram as code', icon: IconCode },
  { id: 'agent', label: 'Connect agent', icon: IconPlugConnected },
] as const;

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

export function V2CanvasWelcome({ onOpen, onTemplate }: {
  onOpen: (mode: V2WorkspaceMode) => void;
  /** Draws a starter diagram: the first minute needs no API key. */
  onTemplate: (template: StarterTemplate) => void;
}) {
  return (
    <div className="ofk-v2-welcome" data-testid="v2-welcome">
      <div className="ofk-v2-guide ofk-v2-guide-tools" aria-hidden="true">
        <svg viewBox="0 0 110 70"><path d="M103 9 C76 11 47 29 9 59 M11 44 Q7 54 9 60 Q20 60 29 55" /></svg><span>Start with a shape</span>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-workspace" aria-hidden="true">
        <span>Another way to create</span><svg viewBox="0 0 120 80"><path d="M8 72 C30 43 67 13 111 13 M99 5 Q108 8 112 13 Q108 20 100 23" /></svg>
      </div>
      <div className="ofk-v2-welcome-center">
        <img src="/Logo_openflowkit.svg" alt="OpenFlowKit" width="48" height="48" />
        <h1>Make room for your next idea.</h1>
        <p>Double-click anywhere to add text, or start with a shape.</p>
        <div className="ofk-v2-welcome-keys">
          <span>
            <Kbd keys="R" /> rectangle
          </span>
          <span>
            <Kbd keys="O" /> ellipse
          </span>
          <span>
            <Kbd keys="A" /> connector
          </span>
        </div>
        <div className="ofk-v2-welcome-actions">
          {MODES.filter(({ id }) => id !== 'model').map(({ id, label, icon }) => (
            <Button key={id} variant="secondary" onClick={() => onOpen(id)}>
              <Icon icon={icon} />
              {label}
            </Button>
          ))}
        </div>
        <div className="ofk-v2-welcome-templates" role="group" aria-label="Start from a template">
          <span>Or start from</span>
          {STARTER_TEMPLATES.map((template) => (
            <Button key={template.name} variant="quiet" title={template.summary} onClick={() => onTemplate(template)}>{template.title}</Button>
          ))}
        </div>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-view" aria-hidden="true">
        <svg viewBox="0 0 110 100"><path d="M102 9 C58 12 25 43 17 89 M8 74 Q12 86 17 91 Q25 85 31 76" /></svg>
        <span>Canvas, layers &amp; view</span>
      </div>
      <div className="ofk-v2-guide ofk-v2-guide-help" aria-hidden="true"><span>Keyboard shortcuts</span><svg viewBox="0 0 110 100"><path d="M8 9 C53 8 84 42 94 89 M82 78 Q90 87 95 91 Q101 82 102 73" /></svg></div>
    </div>
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
