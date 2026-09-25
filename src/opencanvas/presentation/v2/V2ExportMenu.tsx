// Export panel: one intent (format + scope + scale) over the shared exporter.
// Owns no document state; the host passes the live document in. One instance
// serves both entry points — the canvas menu's Export… and an element's
// context menu — so scope always matches what the user pointed at.
import { useState } from 'react';
import { IconCopy, IconDownload, IconMovie } from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import { Button, Icon, Popover, PopoverHeader, Segmented } from '../design-system';
import {
  buildV2Export, copyImageToClipboard, downloadV2Export, printV2Export,
  type V2ExportFormat, type V2ExportScope, type V2ExportTheme,
} from './v2Export';

export interface V2ExportMenuProps {
  readonly open: boolean;
  readonly anchorRef: React.RefObject<HTMLElement | null>;
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly selectedNodeIds: readonly string[];
  /** Connector ids when the selection is connections, not nodes. */
  readonly selectedConnectorIds?: readonly string[];
  /** The scope this entry point implies: Page from the document bar, Selection from an element. */
  readonly initialScope?: V2ExportScope;
  readonly onClose: () => void;
  readonly onToast: (title: string, tone: 'info' | 'success' | 'danger') => void;
  /** Animation is a docked panel, not a popover: too much to read in a flyout. */
  readonly onOpenAnimation: () => void;
}

const FORMATS: readonly { value: V2ExportFormat; label: string; title: string }[] = [
  { value: 'png', label: 'PNG', title: 'Raster image, transparent option free' },
  { value: 'svg', label: 'SVG', title: 'Vector, opens in Figma and Illustrator' },
  { value: 'pdf', label: 'PDF', title: 'Opens the print dialog; choose "Save as PDF"' },
  { value: 'json', label: 'JSON', title: 'Whole document, every page' },
];

/** What Selection means right now, in the element's own words. */
function selectionCaption(nodeIds: readonly string[], connectorIds: readonly string[], page: SceneDocumentV1['pages'][number] | undefined): string {
  if (connectorIds.length > 0) {
    return connectorIds.length === 1 ? 'The selected connection.' : `${connectorIds.length} selected connections.`;
  }
  if (nodeIds.length > 1) return `${nodeIds.length} selected elements and everything inside them.`;
  const kind = page?.nodes.find(({ id }) => id === nodeIds[0])?.kind;
  return kind && isContainerNodeKind(kind)
    ? `The selected ${kind} and everything inside it.`
    : 'The selected element.';
}

export function V2ExportMenu({
  open, anchorRef, document, pageId, selectedNodeIds, selectedConnectorIds = [], initialScope = 'page',
  onClose, onToast, onOpenAnimation,
}: V2ExportMenuProps) {
  const [format, setFormat] = useState<V2ExportFormat>('png');
  const [scope, setScope] = useState<V2ExportScope>(initialScope);
  // The panel opens at the scope of its entry point, without a stale frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setScope(initialScope);
  }
  const [scale, setScale] = useState<1 | 2>(2);
  const [theme, setTheme] = useState<V2ExportTheme>('light');
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasSelection = selectedNodeIds.length > 0 || selectedConnectorIds.length > 0;
  const effectiveScope: V2ExportScope = scope === 'selection' && !hasSelection ? 'page' : scope;
  // JSON is the whole document; on an element it would quietly export everything.
  const effectiveFormat: V2ExportFormat = format === 'json' && effectiveScope === 'selection' ? 'png' : format;
  const activePage = document.pages.find((page) => page.id === pageId) ?? document.pages[0];
  // Exporting an empty page is an error, not an empty file: say so up front.
  const empty = effectiveScope === 'selection'
    ? !hasSelection
    : effectiveScope === 'page' && (activePage?.nodes.length ?? 0) + (activePage?.connectors.length ?? 0) === 0;
  const request = {
    document, format: effectiveFormat, scope: effectiveScope, pageId, theme,
    ...(effectiveScope === 'selection'
      ? { selectedNodeIds, ...(selectedConnectorIds.length ? { selectedConnectorIds } : {}) }
      : {}),
    ...(effectiveFormat === 'png' ? { scale } : {}),
    ...(effectiveFormat === 'png' || effectiveFormat === 'svg' ? { transparent } : {}),
  } as const;
  const caption = empty
    ? effectiveScope === 'selection' ? 'Select an element or connection first.' : 'Nothing to export here — this page has no shapes.'
    : effectiveScope === 'selection' ? selectionCaption(selectedNodeIds, selectedConnectorIds, activePage)
      : effectiveScope === 'document' ? 'Every page as its own file.' : 'The current page.';

  async function run(action: 'download' | 'copy-png'): Promise<void> {
    setBusy(true);
    try {
      if (effectiveFormat === 'pdf') {
        await printV2Export(request);
        onToast('Print dialog opened — choose "Save as PDF".', 'info');
      } else if (action === 'copy-png') {
        const [file] = await buildV2Export({ ...request, format: 'png', scale: 2 });
        if (!file?.bytes || !(await copyImageToClipboard(file.bytes, 'image/png'))) {
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
        <Button className="ofk-v2-export-animate" variant="quiet"
          onClick={() => { onClose(); onOpenAnimation(); }}>
          <Icon icon={IconMovie} /> Animate this page…
        </Button>
        <Segmented<V2ExportFormat> label="Format" value={effectiveFormat} onChange={setFormat}
          options={effectiveScope === 'selection'
            ? FORMATS.map((option) => option.value === 'json'
              ? { ...option, disabled: true, title: 'JSON is the whole document' } : option)
            : FORMATS} />
        <Segmented<V2ExportScope> label="Scope" value={effectiveScope} onChange={setScope}
          options={[
            { value: 'selection', label: 'Selection', disabled: !hasSelection, title: 'Select shapes first' },
            { value: 'page', label: 'Page' },
            { value: 'document', label: 'All pages', title: 'One file per page' },
          ]} />
        {effectiveFormat === 'png' ? (
          <Segmented<'1' | '2'> label="Resolution" value={scale === 2 ? '2' : '1'}
            onChange={(value) => setScale(value === '2' ? 2 : 1)}
            options={[{ value: '1', label: '1×' }, { value: '2', label: '2×' }]} />
        ) : null}
        {effectiveFormat === 'png' || effectiveFormat === 'svg' ? (
          <>
            <Segmented<V2ExportTheme> label="Theme" value={theme} onChange={setTheme}
              options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'print', label: 'Print' }]} />
            <Segmented<'opaque' | 'transparent'> label="Background" value={transparent ? 'transparent' : 'opaque'}
              onChange={(value) => setTransparent(value === 'transparent')}
              options={[
                { value: 'opaque', label: 'Canvas', title: 'Theme background' },
                { value: 'transparent', label: 'Transparent', title: 'No background rectangle' },
              ]} />
          </>
        ) : null}
        <div className="ofk-v2-export-actions">
          <Button variant="primary" disabled={busy || empty} onClick={() => { void run('download'); }}>
            <Icon icon={IconDownload} /> {effectiveFormat === 'pdf' ? 'Print / PDF' : 'Download'}
          </Button>
          {effectiveFormat === 'png' ? (
            <Button variant="quiet" disabled={busy || empty} onClick={() => { void run('copy-png'); }}>
              <Icon icon={IconCopy} /> Copy 2×
            </Button>
          ) : null}
        </div>
        <p className="ofk-caption">{caption}</p>
      </div>
    </Popover>
  );
}
