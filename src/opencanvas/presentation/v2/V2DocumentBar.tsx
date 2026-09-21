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
import { buildV2JsonExport, buildV2SvgExport, downloadTextFile } from './v2Export';

interface V2DocumentBarProps extends V2SettingsProps {
  readonly document: SceneDocumentV1;
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
  const exportRef = useRef<HTMLButtonElement>(null);
  const save = saveLabel(props.saveStatus);
  const page = props.document.pages[0];
  const canExportSvg = page && (page.nodes.length > 0 || page.connectors.length > 0);
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

  function download(build: () => { filename: string; text: string; mime: string }): void {
    try {
      const { filename, text, mime } = build();
      downloadTextFile(filename, text, mime);
    } catch {
      props.onToast({
        id: `toast-${Date.now()}`,
        tone: 'danger',
        title: 'Export failed. Nothing was downloaded.',
      });
    }
  }

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
          <Tooltip content="Export">
            <IconButton ref={exportRef} variant="quiet" label="Export" icon={<Icon icon={IconDownload} />}
              aria-haspopup="menu" onClick={() => setExportOpen(true)} />
          </Tooltip>
        </Toolbar>
      </FloatingRegion>

      <Menu open={menuOpen} anchorRef={settingsRef} onClose={() => setMenuOpen(false)} label="Canvas menu" placement="bottom-start">
        <MenuItem icon={<Icon icon={IconPencil} />} disabled={props.readOnly} onSelect={startRename}>Rename diagram</MenuItem>
        <MenuItem icon={<Icon icon={IconSettings} />} onSelect={() => setSettingsOpen(true)}>Settings</MenuItem>
        <MenuItem icon={<Icon icon={IconDownload} />} onSelect={() => setExportOpen(true)}>Export</MenuItem>
      </Menu>
      <V2Settings open={settingsOpen} anchorRef={settingsRef} onClose={() => setSettingsOpen(false)}
        preferences={props.preferences} canvasDefaultColor={props.canvasDefaultColor}
        onPreferencesChange={props.onPreferencesChange} />
      <Menu
        open={exportOpen}
        anchorRef={exportRef}
        onClose={() => setExportOpen(false)}
        label="Export"
        placement="bottom-end"
      >
        <MenuItem
          onSelect={() => {
            if (!canExportSvg) {
              props.onToast({
                id: `toast-${Date.now()}`,
                tone: 'info',
                title: 'Add a shape or connector before exporting SVG.',
              });
              return;
            }
            download(() => {
              const { filename, svg } = buildV2SvgExport(props.document);
              return { filename, text: svg, mime: 'image/svg+xml' };
            });
          }}
          icon={<Icon icon={IconDownload} />}
        >
          Download SVG
        </MenuItem>
        <MenuItem
          onSelect={() =>
            download(() => {
              const { filename, json } = buildV2JsonExport(props.document);
              return { filename, text: json, mime: 'application/json' };
            })
          }
          icon={<Icon icon={IconDownload} />}
        >
          Download JSON
        </MenuItem>
      </Menu>
    </>
  );
}
