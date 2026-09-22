// Export panel: one intent (format + scope + scale) over the shared exporter.
// Owns no document state; the document bar passes the live document in.
import { useState } from 'react';
import { IconCopy, IconDownload } from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { Button, Icon, Popover, PopoverHeader, Segmented } from '../design-system';
import { V2MotionExport } from './V2MotionExport';
import {
  buildV2Export, copyPngToClipboard, downloadV2Export, printV2Export,
  type V2ExportFormat, type V2ExportScope, type V2ExportTheme,
} from './v2Export';

export interface V2ExportMenuProps {
  readonly open: boolean;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly selectedNodeIds: readonly string[];
  readonly onClose: () => void;
  readonly onToast: (title: string, tone: 'info' | 'success' | 'danger') => void;
}

const FORMATS: readonly { value: V2ExportFormat; label: string; title: string }[] = [
  { value: 'png', label: 'PNG', title: 'Raster image, transparent option free' },
  { value: 'svg', label: 'SVG', title: 'Vector, opens in Figma and Illustrator' },
  { value: 'pdf', label: 'PDF', title: 'Opens the print dialog; choose "Save as PDF"' },
  { value: 'json', label: 'JSON', title: 'Whole document, every page' },
];

export function V2ExportMenu({ open, anchorRef, document, pageId, selectedNodeIds, onClose, onToast }: V2ExportMenuProps) {
  const [mode, setMode] = useState<'still' | 'animation'>('still');
  const [format, setFormat] = useState<V2ExportFormat>('png');
  const [scope, setScope] = useState<V2ExportScope>('page');
  const [scale, setScale] = useState<1 | 2>(2);
  const [theme, setTheme] = useState<V2ExportTheme>('light');
  const [busy, setBusy] = useState(false);
  const effectiveScope: V2ExportScope = scope === 'selection' && selectedNodeIds.length === 0 ? 'page' : scope;
  const activePage = document.pages.find((page) => page.id === pageId) ?? document.pages[0];
  // Exporting an empty page is an error, not an empty file: say so up front.
  const empty = effectiveScope === 'selection'
    ? selectedNodeIds.length === 0
    : effectiveScope === 'page' && (activePage?.nodes.length ?? 0) + (activePage?.connectors.length ?? 0) === 0;
  const request = {
    document, format, scope: effectiveScope, pageId, theme,
    ...(effectiveScope === 'selection' ? { selectedNodeIds } : {}),
    ...(format === 'png' ? { scale } : {}),
  } as const;

  async function run(action: 'download' | 'copy-png'): Promise<void> {
    setBusy(true);
    try {
      if (format === 'pdf') {
        printV2Export(request);
        onToast('Print dialog opened — choose "Save as PDF".', 'info');
      } else if (action === 'copy-png') {
        const [file] = await buildV2Export({ ...request, format: 'png', scale: 2 });
        if (!file?.bytes || !(await copyPngToClipboard(file.bytes))) {
          onToast('This browser cannot copy images to the clipboard.', 'danger');
        } else {
          onToast('PNG copied to the clipboard.', 'success');
        }
      } else {
        const files = await buildV2Export(request);
        downloadV2Export(files);
        onToast(files.length > 1 ? `${files.length} files downloaded.` : `${files[0]?.filename ?? 'Export'} downloaded.`, 'success');
      }
      onClose();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Export failed.', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover role="dialog" aria-label="Export" open={open} anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <PopoverHeader title="Export" close={<Button variant="quiet" onClick={onClose}>Done</Button>} />
      <div className="ofk-v2-properties">
        <Segmented<'still' | 'animation'> label="Export kind" value={mode} onChange={setMode}
          options={[{ value: 'still', label: 'Still' }, { value: 'animation', label: 'Animation' }]} />
        {mode === 'animation' ? (
          <V2MotionExport document={document} pageId={pageId} onToast={onToast} />
        ) : (
          <>
        <Segmented<V2ExportFormat> label="Format" value={format} onChange={setFormat} options={FORMATS} />
        <Segmented<V2ExportScope> label="Scope" value={effectiveScope} onChange={setScope}
          options={[
            { value: 'selection', label: 'Selection', disabled: selectedNodeIds.length === 0, title: 'Select shapes first' },
            { value: 'page', label: 'Page' },
            { value: 'document', label: 'All pages', title: 'One file per page' },
          ]} />
        {format === 'png' ? (
          <Segmented<'1' | '2'> label="Resolution" value={scale === 2 ? '2' : '1'}
            onChange={(value) => setScale(value === '2' ? 2 : 1)}
            options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }]} />
        ) : null}
        {format === 'png' || format === 'svg' ? (
          <Segmented<V2ExportTheme> label="Theme" value={theme} onChange={setTheme}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'print', label: 'Print' }]} />
        ) : null}
        <div className="ofk-v2-export-actions">
          <Button variant="primary" disabled={busy || empty} onClick={() => { void run('download'); }}>
            <Icon icon={IconDownload} /> {format === 'pdf' ? 'Print / PDF' : 'Download'}
          </Button>
          {format === 'png' ? (
            <Button variant="quiet" disabled={busy || empty} onClick={() => { void run('copy-png'); }}>
              <Icon icon={IconCopy} /> Copy 2×
            </Button>
          ) : null}
        </div>
        <p className="ofk-caption">{empty
          ? 'Nothing to export here — this page has no shapes.'
          : effectiveScope === 'selection' ? 'Selected shapes only.'
            : effectiveScope === 'document' ? 'Every page as its own file.' : 'The current page.'}</p>
          </>
        )}
      </div>
    </Popover>
  );
}
