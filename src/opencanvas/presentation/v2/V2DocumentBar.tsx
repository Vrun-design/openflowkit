import { V2Settings, type V2SettingsProps } from './V2Settings';
import { useEffect, useRef, useState } from 'react';
import {
  IconCloudCheck,
  IconMenu2,
  IconPencil,
  IconSettings,
  IconCloudOff,
  IconDownload,
  IconLoader2,
  IconLock,
} from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  Button,
  FloatingRegion,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  type ToastItem,
} from '../design-system';
import type { V2SaveStatus } from './useV2Autosave';
import { V2ExportMenu } from './V2ExportMenu';
import { V2PagesMenu } from './V2PagesMenu';
import { V2AgentConnect, AgentPlugIcon, type V2AgentConnectModel } from './V2AgentConnect';
import type { useV2Pages } from './useV2Pages';

interface V2DocumentBarProps extends V2SettingsProps {
  readonly document: SceneDocumentV1;
  /** Active page id; export and page controls act on it. */
  readonly pageId: string;
  readonly selectedNodeIds: readonly string[];
  readonly pages: ReturnType<typeof useV2Pages>;
  readonly bridge: V2AgentConnectModel;
  readonly saveStatus: V2SaveStatus;
  readonly readOnly: boolean;
  readonly onRetrySave: () => void;
  readonly onReload: () => void;
  readonly onToast: (toast: ToastItem) => void;
  readonly onRename: (name: string) => void;
}

// ponytail: icon-only save indicator; text lives in the tooltip + live region.
function saveLabel(status: V2SaveStatus): { tone: 'neutral' | 'success' | 'warning' | 'danger'; text: string; icon: typeof IconCloudCheck } {
  switch (status.state) {
    case 'clean':
      return { tone: 'neutral', text: 'Saved', icon: IconCloudCheck };
    case 'pending':
      return { tone: 'neutral', text: 'Saving…', icon: IconLoader2 };
    case 'saved':
      return { tone: 'success', text: 'Saved', icon: IconCloudCheck };
    case 'conflict':
      return { tone: 'warning', text: 'Conflict — reload to continue', icon: IconCloudOff };
    case 'failed':
      return status.reason === 'quota'
        ? { tone: 'danger', text: 'Save failed — storage is full', icon: IconCloudOff }
        : status.reason === 'unavailable'
          ? { tone: 'danger', text: 'Save failed — storage unavailable', icon: IconCloudOff }
          : { tone: 'danger', text: 'Save failed', icon: IconCloudOff };
  }
}

export function V2DocumentBar(props: V2DocumentBarProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(props.document.name);
  const [exportOpen, setExportOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const pagesRef = useRef<HTMLButtonElement>(null);
  const bridgeRef = useRef<HTMLButtonElement>(null);
  const activePageName = props.pages.activePage?.name ?? 'Page 1';
  const save = saveLabel(props.saveStatus);
  useEffect(() => { if (editingTitle) titleRef.current?.select(); }, [editingTitle]);

  function startRename(): void {
    if (props.readOnly) return;
    setTitleDraft(props.document.name);
    setEditingTitle(true);
  }

  function finishRename(commit: boolean): void {
    const name = titleDraft.trim();
    if (commit && name && name !== props.document.name) props.onRename(name);
    else setTitleDraft(props.document.name);
    setEditingTitle(false);
  }

  const toast = (title: string, tone: ToastItem['tone']): void =>
    props.onToast({ id: `toast-${Date.now()}`, tone, title });

  return (
    <>
      <FloatingRegion slot="top-start">
        <Toolbar label="Document" className="ofk-v2-document-bar">
          <Tooltip content="Canvas menu">
            <IconButton ref={settingsRef} variant="quiet" label="Canvas menu"
              icon={<Icon icon={IconMenu2} />}
              aria-expanded={menuOpen} aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)} />
          </Tooltip>
          {editingTitle ? (
            <input ref={titleRef} className="ofk-v2-document-title-input" value={titleDraft}
              aria-label="Diagram title" maxLength={120}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={() => finishRename(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') { event.preventDefault(); finishRename(false); }
              }} />
          ) : (
            <Button variant="quiet" className="ofk-v2-document-title" title="Rename diagram"
              onClick={startRename}>
              {props.document.name}
            </Button>
          )}
          <Tooltip content={props.readOnly ? 'Read-only' : save.text}>
            <span className="ofk-v2-save-status" role="status" aria-atomic
              data-tone={props.readOnly ? 'warning' : save.tone}
              data-busy={props.saveStatus.state === 'pending' || undefined}>
              <Icon icon={props.readOnly ? IconLock : save.icon} />
              <span className="ofk-visually-hidden">{props.readOnly ? 'Read-only' : save.text}</span>
            </span>
          </Tooltip>
          {props.saveStatus.state === 'failed' ? (
            <Button variant="quiet" onClick={props.onRetrySave}>
              Retry
            </Button>
          ) : null}
          {props.saveStatus.state === 'conflict' ? (
            <Button variant="quiet" onClick={props.onReload}>
              Reload
            </Button>
          ) : null}
          <Tooltip content={props.bridge.status === 'connected'
            ? 'Agent connected — click to manage'
            : 'Connect agent (MCP)'}>
            <IconButton ref={bridgeRef} variant="quiet"
              label="Connect agent"
              data-bridge-status={props.bridge.status}
              aria-expanded={bridgeOpen} aria-haspopup="dialog"
              icon={<Icon icon={props.bridge.status === 'connected' ? AgentPlugIcon.connected : AgentPlugIcon.off} />}
              onClick={() => setBridgeOpen((open) => !open)} />
          </Tooltip>
          <Tooltip content="Pages">
            <Button ref={pagesRef} variant="quiet" aria-expanded={pagesOpen} aria-haspopup="dialog"
              aria-label={`Pages (current: ${activePageName})`}
              onClick={() => setPagesOpen(true)}>
              {activePageName}
              {props.pages.pages.length > 1 ? <span className="ofk-v2-page-total">{` / ${props.pages.pages.length}`}</span> : null}
            </Button>
          </Tooltip>
        </Toolbar>
      </FloatingRegion>

      <Menu open={menuOpen} anchorRef={settingsRef} onClose={() => setMenuOpen(false)} label="Canvas menu" placement="bottom-start">
        <MenuItem icon={<Icon icon={IconPencil} />} disabled={props.readOnly} onSelect={startRename}>Rename diagram</MenuItem>
        <MenuItem icon={<Icon icon={IconSettings} />} onSelect={() => setSettingsOpen(true)}>Settings</MenuItem>
        <MenuItem icon={<Icon icon={IconDownload} />} onSelect={() => setExportOpen(true)}>Export…</MenuItem>
      </Menu>
      <V2Settings open={settingsOpen} anchorRef={settingsRef} onClose={() => setSettingsOpen(false)}
        preferences={props.preferences} canvasDefaultColor={props.canvasDefaultColor}
        onPreferencesChange={props.onPreferencesChange} />
      <V2PagesMenu open={pagesOpen} anchorRef={pagesRef} pages={props.pages} onClose={() => setPagesOpen(false)} />
      <V2AgentConnect {...props.bridge} open={bridgeOpen} anchorRef={bridgeRef} onClose={() => setBridgeOpen(false)} />
      <V2ExportMenu open={exportOpen} anchorRef={settingsRef} document={props.document}
        pageId={props.pageId} selectedNodeIds={props.selectedNodeIds}
        onClose={() => setExportOpen(false)} onToast={toast} />
    </>
  );
}
