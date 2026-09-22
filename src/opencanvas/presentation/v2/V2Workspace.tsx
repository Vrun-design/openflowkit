import {
  IconCode,
  IconKeyboard,
  IconPlugConnected,
  IconPlus,
  IconPresentation,
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
import { shortcutGroups } from './v2Shortcuts';

export type V2WorkspaceMode = 'assistant' | 'slides' | 'code' | 'model' | 'agent';
const MODES = [
  { id: 'assistant', label: 'AI assistant', icon: IconSparkles },
  { id: 'model', label: 'Architecture model', icon: IconSitemap },
  { id: 'slides', label: 'Slides', icon: IconPresentation },
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

export function V2CanvasWelcome({ onOpen }: { onOpen: (mode: V2WorkspaceMode) => void }) {
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
          {MODES.filter(({ id }) => id !== 'model' && id !== 'slides').map(({ id, label, icon }) => (
            <Button key={id} variant="secondary" onClick={() => onOpen(id)}>
              <Icon icon={icon} />
              {label}
            </Button>
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

// ponytail: local drafts only — connect these shells to the DSL compiler and slide model in their planned slices.
export function V2DraftPanel({
  mode,
  onClose,
  code,
  onCodeChange,
  slides,
  onAddSlide,
}: {
  mode: 'slides' | 'code';
  onClose: () => void;
  code: string;
  onCodeChange: (code: string) => void;
  slides: number;
  onAddSlide: () => void;
}) {
  return (
    <Panel
      title={mode === 'code' ? 'Diagram as code' : 'Slides'}
      onClose={onClose}
      className="ofk-v2-workspace-panel"
      tools={<span className="ofk-v2-preview-label">Preview</span>}
    >
      {mode === 'code' ? (
        <div className="ofk-v2-panel-stack">
          <div>
            <h3>Think in connections.</h3>
            <p className="ofk-v2-muted">Describe your diagram. Keep the source close.</p>
          </div>
          <label className="ofk-v2-code-label" htmlFor="v2-code">
            Diagram source <span>OpenFlow DSL</span>
          </label>
          <textarea
            id="v2-code"
            className="ofk-v2-code-editor"
            spellCheck={false}
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
          />
          <footer className="ofk-v2-panel-footer">
            <Button disabled>
              <Icon icon={IconCode} /> Generate diagram
            </Button>
            <p>Editing preview. Diagram generation is coming soon.</p>
          </footer>
        </div>
      ) : (
        <div className="ofk-v2-panel-stack">
          {slides === 0 ? (
            <div className="ofk-model-welcome ofk-v2-slides-welcome">
              <div className="ofk-v2-slides-hero" aria-hidden="true"><i /><i /><span><b />01</span></div>
              <h3>Give your ideas a storyline.</h3>
              <p>Frame moments on your canvas and walk through them as a presentation.</p>
              <Button onClick={onAddSlide}><Icon icon={IconPlus} /> Add slide</Button>
              <span className="ofk-model-welcome-note">Each slide is a frame of this canvas.</span>
            </div>
          ) : (
          <div className="ofk-v2-slide-list">
            {
              Array.from({ length: slides }, (_, index) => (
                <div className="ofk-v2-slide" key={index}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <img src="/Logo_openflowkit.svg" width="24" height="24" alt="" />
                    <strong>{index === 0 ? 'The big idea' : `Slide ${index + 1}`}</strong>
                    <small>Canvas frame preview</small>
                  </div>
                </div>
              ))
            }
            <Button onClick={onAddSlide}>
              <Icon icon={IconPlus} /> Add slide
            </Button>
          </div>
          )}
          <footer className="ofk-v2-panel-footer">
            <Button disabled>
              <Icon icon={IconPresentation} /> Start presentation
            </Button>
            <p>Layout preview. Slides are not saved yet.</p>
          </footer>
        </div>
      )}
    </Panel>
  );
}

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
