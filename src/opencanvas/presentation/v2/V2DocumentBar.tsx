import { V2Settings, type V2SettingsProps } from './V2Settings';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  IconCloudCheck,
  IconFolderOff,
  IconFolderOpen,
  IconMenu2,
  IconPencil,
  IconSettings,
  IconCloudOff,
  IconDownload,
  IconFileImport,
  IconLoader2,
  IconLock,
  IconPlugConnected,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import { documentFromFileText } from '../../../services/storage/v2/openDocumentFile';
import { mintV2Id } from './v2Document';
import {
  Button,
  FloatingRegion,
  Icon,
  IconButton,
  Menu,
  MenuSeparator,
  MenuItem,
  Toolbar,
  Tooltip,
  type ToastItem,
} from '../design-system';
import type { V2SaveStatus } from './useV2Autosave';
import { V2ExportMenu } from './V2ExportMenu';
import { V2PagesMenu } from './V2PagesMenu';
import type { V2BridgeStatus } from './useV2AgentBridge';
import type { useV2Pages } from './useV2Pages';
import { isWorkspacePickerSupported } from '../../../services/workspace/workspaceFolder';

interface V2DocumentBarProps extends V2SettingsProps {
  readonly document: SceneDocumentV1;
  /** Active page id; export and page controls act on it. */
  readonly pageId: string;
  readonly selectedNodeIds: readonly string[];
  readonly pages: ReturnType<typeof useV2Pages>;
  readonly bridge: { readonly status: V2BridgeStatus; readonly onOpen: () => void };
  readonly saveStatus: V2SaveStatus;
  readonly readOnly: boolean;
  readonly onRetrySave: () => void;
  readonly onReload: () => void;
  readonly onToast: (toast: ToastItem) => void;
  readonly onRename: (name: string) => void;
  /** Export… → Animation opens the docked panel; the bar only launches it. */
  readonly onOpenAnimation: () => void;
  readonly workspace?: {
    readonly name: string | null;
    readonly onOpenFolder: () => void;
    readonly onCloseFolder: () => void;
  };
  /** Architecture level chain when the document carries a model. */
  readonly breadcrumb?: readonly { readonly pageId: string; readonly label: string; readonly elementId?: string }[];
  readonly onCrumb?: (crumb: { readonly pageId: string; readonly elementId?: string }) => void;
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
  const pagesRef = useRef<HTMLButtonElement>(null);
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

  // Open a .json file (our export or a V1 file) as a new document and go there.
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const openFile = async (file: File): Promise<void> => {
    const opened = documentFromFileText(await file.text(), mintV2Id('doc'));
    if ('error' in opened) {
      toast(opened.error, 'danger');
      return;
    }
    const saved = await createV2Repository(window.indexedDB).saveDocument(opened.document.id, opened.document, 0);
    if (saved.status !== 'saved') {
      toast('Could not save the opened file.', 'danger');
      return;
    }
    navigate(`/d/${opened.document.id}`);
  };

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
          {props.breadcrumb && props.breadcrumb.length > 0 ? (
            <nav className="ofk-v2-breadcrumb" aria-label="Architecture level">
              {props.breadcrumb.map((crumb, index) => (
                <Fragment key={`${crumb.pageId}-${index}`}>
                  {index > 0 ? <span className="ofk-v2-breadcrumb-sep" aria-hidden="true">/</span> : null}
                  {index === props.breadcrumb!.length - 1 ? (
                    <span className="ofk-v2-breadcrumb-current" aria-current="page">{crumb.label}</span>
                  ) : (
                    <button type="button" className="ofk-v2-breadcrumb-link"
                      onClick={() => props.onCrumb?.(crumb)}>
                      {crumb.label}
                    </button>
                  )}
                </Fragment>
              ))}
            </nav>
          ) : null}
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
            <IconButton variant="quiet"
              label="Connect agent"
              data-bridge-status={props.bridge.status}
              icon={<Icon icon={IconPlugConnected} />}
              onClick={props.bridge.onOpen} />
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
        <MenuItem icon={<Icon icon={IconFileImport} />} onSelect={() => fileRef.current?.click()}>Open file…</MenuItem>
        <MenuItem icon={<Icon icon={IconDownload} />} onSelect={() => setExportOpen(true)}>Export…</MenuItem>
        {/* File System Access API only (Chrome/Edge); elsewhere the item would be a silent no-op. */}
        {props.workspace && isWorkspacePickerSupported() ? (
          <>
            <MenuSeparator />
            <MenuItem icon={<Icon icon={IconFolderOpen} />} onSelect={props.workspace.onOpenFolder}>
              {props.workspace.name ? `Open another folder (${props.workspace.name})` : 'Open workspace folder…'}
            </MenuItem>
            {props.workspace.name ? (
              <MenuItem icon={<Icon icon={IconFolderOff} />} onSelect={props.workspace.onCloseFolder}>
                Stop syncing {props.workspace.name}
              </MenuItem>
            ) : null}
          </>
        ) : null}
      </Menu>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-hidden="true" tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void openFile(file).catch((error: unknown) => toast(error instanceof Error ? error.message : 'Could not open the file.', 'danger'));
        }} />
      <V2Settings open={settingsOpen} anchorRef={settingsRef} onClose={() => setSettingsOpen(false)}
        preferences={props.preferences} canvasDefaultColor={props.canvasDefaultColor}
        onPreferencesChange={props.onPreferencesChange} />
      <V2PagesMenu open={pagesOpen} anchorRef={pagesRef} pages={props.pages} onClose={() => setPagesOpen(false)} />
      <V2ExportMenu open={exportOpen} anchorRef={settingsRef} document={props.document}
        pageId={props.pageId} selectedNodeIds={props.selectedNodeIds}
        onClose={() => setExportOpen(false)} onToast={toast}
        onOpenAnimation={props.onOpenAnimation} />
    </>
  );
}
