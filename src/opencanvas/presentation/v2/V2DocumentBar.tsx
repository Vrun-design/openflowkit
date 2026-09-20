import { useRef, useState } from 'react';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDownload,
} from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  Button,
  FloatingRegion,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  Status,
  Toolbar,
  Tooltip,
  type ToastItem,
} from '../design-system';
import type { V2SaveStatus } from './useV2Autosave';
import { buildV2JsonExport, buildV2SvgExport, downloadTextFile } from './v2Export';

interface V2DocumentBarProps {
  readonly document: SceneDocumentV1;
  readonly saveStatus: V2SaveStatus;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly readOnly: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onRetrySave: () => void;
  readonly onReload: () => void;
  readonly onToast: (toast: ToastItem) => void;
}

function saveLabel(status: V2SaveStatus): { tone: 'neutral' | 'success' | 'warning' | 'danger'; text: string } {
  switch (status.state) {
    case 'clean':
      return { tone: 'neutral', text: 'Saved' };
    case 'pending':
      return { tone: 'neutral', text: 'Saving…' };
    case 'saved':
      return { tone: 'success', text: 'Saved' };
    case 'conflict':
      return { tone: 'warning', text: 'Conflict — reload to continue' };
    case 'failed':
      return status.reason === 'quota'
        ? { tone: 'danger', text: 'Save failed — storage is full' }
        : status.reason === 'unavailable'
          ? { tone: 'danger', text: 'Save failed — storage unavailable' }
          : { tone: 'danger', text: 'Save failed' };
  }
}

export function V2DocumentBar(props: V2DocumentBarProps): React.JSX.Element {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLButtonElement>(null);
  const save = saveLabel(props.saveStatus);
  const canExportSvg = props.document.pages[0]?.nodes.length > 0;

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
        <Toolbar label="Document">
          <img className="ofk-v2-logo" src="/Logo_openflowkit.svg" alt="" width={20} height={20} />
          <Button variant="quiet" title={props.document.name}>
            {props.document.name}
          </Button>
          {props.readOnly ? (
            <Status tone="warning" live>
              Read-only
            </Status>
          ) : (
            <Status tone={save.tone} live>
              {save.text}
            </Status>
          )}
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
        </Toolbar>
      </FloatingRegion>

      <FloatingRegion slot="top-end">
        <Toolbar label="History and export">
          <Tooltip content="Undo" shortcut="⌘Z">
            <IconButton
              variant="quiet"
              label="Undo"
              icon={<Icon icon={IconArrowBackUp} />}
              disabled={!props.canUndo}
              onClick={props.onUndo}
            />
          </Tooltip>
          <Tooltip content="Redo" shortcut="⇧⌘Z">
            <IconButton
              variant="quiet"
              label="Redo"
              icon={<Icon icon={IconArrowForwardUp} />}
              disabled={!props.canRedo}
              onClick={props.onRedo}
            />
          </Tooltip>
          <Button ref={exportRef} variant="quiet" aria-haspopup="menu" onClick={() => setExportOpen(true)}>
            Export
          </Button>
        </Toolbar>
      </FloatingRegion>

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
                title: 'Add a shape before exporting SVG.',
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
