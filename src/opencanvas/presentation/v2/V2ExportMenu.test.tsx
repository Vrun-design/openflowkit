import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { compile } from '../../../dsl/compile';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { V2ExportMenu } from './V2ExportMenu';

// jsdom has no ResizeObserver; the popover places itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const toMermaid = vi.hoisted(() => ({ fail: null as Error | null }));
vi.mock('../../../dsl/mermaid/toMermaid', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../dsl/mermaid/toMermaid')>();
  return { ...actual, diagramToMermaid: (...args: Parameters<typeof actual.diagramToMermaid>) => {
    if (toMermaid.fail) throw toMermaid.fail;
    return actual.diagramToMermaid(...args);
  } };
});

const exporter = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock('./v2Export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./v2Export')>();
  return { ...actual, downloadV2Export: exporter.download,
    buildV2Export: async () => [{ filename: 'diagram-page-1.svg', mime: 'image/svg+xml', text: '<svg/>' }] };
});
const share = vi.hoisted(() => ({ fail: null as Error | null }));
vi.mock('../../../services/share/shareClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/share/shareClient')>();
  return { ...actual, createShareLink: async () => { throw share.fail; } };
});
vi.mock('../../../services/share/turnstile', () => ({ getTurnstileToken: async () => 't' }));

async function copyMermaid(clipboard: () => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(clipboard) } });
  const compiled = await compile('flowchart right\nClient -> API : login\nAPI -> Database');
  const document = createTestDocument({ nodes: [compiled.frame, ...compiled.groups, ...compiled.nodes], connectors: compiled.connectors });
  const onToast = vi.fn();
  render(<V2ExportMenu open anchorRef={{ current: window.document.body }} document={document} pageId={document.pages[0]!.id}
    selectedNodeIds={[]} onClose={vi.fn()} onToast={onToast} onOpenAnimation={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy as Mermaid' }));
  await waitFor(() => expect(onToast).toHaveBeenCalled());
  return onToast.mock.calls[0]!;
}

describe('Copy as Mermaid', () => {
  it('blames the clipboard only when the clipboard refused', async () => {
    toMermaid.fail = null;
    expect(await copyMermaid(() => Promise.reject(new DOMException('denied', 'NotAllowedError'))))
      .toEqual(['This browser blocked copying to the clipboard.', 'danger']);
  });

  it('says what went wrong when the diagram could not be written as Mermaid', async () => {
    toMermaid.fail = new Error('A node has no label.');
    expect(await copyMermaid(() => Promise.resolve())).toEqual(['A node has no label.', 'danger']);
  });
});

describe('Download', () => {
  it('keeps the panel open, so the next variant is one click', async () => {
    const document = createTestDocument({ nodes: [(await compile('flowchart right\nA -> B')).frame] });
    const onClose = vi.fn();
    const onToast = vi.fn();
    render(<V2ExportMenu open anchorRef={{ current: window.document.body }} document={document} pageId={document.pages[0]!.id}
      selectedNodeIds={[]} onClose={onClose} onToast={onToast} onOpenAnimation={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(onToast).toHaveBeenCalledWith('diagram-page-1.svg downloaded.', 'success'));
    expect(exporter.download).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Copy share link', () => {
  it('a share service that is down is not blamed on the connection, and the file is offered', async () => {
    const { ShareError } = await import('../../../services/share/shareClient');
    share.fail = new ShareError('unreachable', 'The share service isn’t reachable right now.');
    const document = createTestDocument({ nodes: [] });
    const onToast = vi.fn();
    render(<V2ExportMenu open anchorRef={{ current: window.document.body }} document={document} pageId={document.pages[0]!.id} canShare
      selectedNodeIds={[]} onClose={vi.fn()} onToast={onToast} onOpenAnimation={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy share link' }));
    await waitFor(() => expect(onToast).toHaveBeenCalled());
    const [title, tone, extra] = onToast.mock.calls[0]!;
    expect([title, tone]).toEqual(['The share service isn’t reachable right now.', 'danger']);
    expect(extra.action.label).toBe('Download file');
    expect(extra.description).not.toMatch(/connection/);
  });
});

describe('Share caption', () => {
  it('mentions “Delete link” only when there is a link to delete', () => {
    const document = createTestDocument({ nodes: [] });
    render(<V2ExportMenu open anchorRef={{ current: window.document.body }} document={document} pageId={document.pages[0]!.id} canShare
      selectedNodeIds={[]} onClose={vi.fn()} onToast={vi.fn()} onOpenAnimation={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Delete link' })).toBeNull();
    expect(screen.getByText(/Share link: the whole document/).textContent).not.toContain('Delete link');
  });
});
