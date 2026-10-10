// The diagram-as-code panel: its draft, the frame it is bound to, and Generate,
// which compiles the draft and commits it as one undo step.
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { detectForeign } from '../../../agent/lint';
import type { DslDiagnostic } from '../../../dsl/ast';
import { compileWorkspace } from '../../../dsl/compile';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { frameEdited, frameScene } from '../../../dsl/frameScene';
import { archModelOfPage } from '../../../dsl/model/model';
import { parse } from '../../../dsl/parse';
import { dslFrameRaw } from '../../../dsl/sceneMeta';
import { serialize } from '../../../dsl/serialize';
import { elkDslLayoutPort } from '../../../services/elk-layout/runtime';
import { resolveDslIcon } from '../../../services/dsl/iconResolver';
import { applySnapsToWorkspace, type WorkspaceSnap } from '../../../services/workspace/workspaceFolder';
import { buildWorkspacePagesCommand, firstViewLanding } from '../../application/dsl/architectureCommands';
import { buildDslPageCommand, nameUntitledDocument, nextDslFrameOrigin } from '../../application/dsl/dslPageCommand';
import { buildAutoIconsOffCommand, hasAutoIcon } from '../../application/dsl/iconCommands';
import { replaceSelection, type CanvasSelection } from '../../application/selection/selection';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import { isDiagramPalette, type DiagramPaletteName } from '../../domain/nodes/nodePalette';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import type { ToastItem } from '../design-system';
import { mintV2Id } from './v2Document';
import { INITIAL_CODE } from './V2Workspace';

export interface V2CodeWorkspaceOptions {
  readonly document: SceneDocumentV1 | null;
  readonly page: ScenePage | null;
  readonly pageRef: RefObject<ScenePage | null>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly readOnly: boolean;
  readonly palette: DiagramPaletteName;
  readonly autoIcons: boolean;
  /** A frame authored in another palette switches the picker to it. */
  readonly onPaletteChange: (palette: DiagramPaletteName) => void;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly fitView: (ids?: readonly string[]) => void;
  readonly openPanel: () => void;
  /** A C4 workspace generated several views; land on the first one's page once it exists. */
  readonly onViews: (pageId: string) => void;
  readonly pushToast: (toast: ToastItem) => void;
  readonly dismissToast: (id: string) => void;
  readonly announce: (message: string) => void;
  /** A template lands with the canvas focused, so keys act on the diagram, not the source. */
  readonly focusCanvas?: () => void;
  /** A template that starts a document is its first state: nothing to undo back to "Untitled". */
  readonly forgetHistory?: () => void;
}

// Below this a phone: the source would cover the diagram it just drew.
const PHONE_PX = 768;

export function useV2CodeWorkspace(options: V2CodeWorkspaceOptions) {
  const {
    document, page, pageRef, hostRef, readOnly, palette, autoIcons, onPaletteChange,
    commit, applySelection, fitView, openPanel, onViews, pushToast, dismissToast, announce, focusCanvas, forgetHistory,
  } = options;
  const [draft, setDraft] = useState(INITIAL_CODE);
  // The frame Generate replaces; null draws a new diagram.
  const [frameId, setFrameId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // False while the panel was opened by a template beside its diagram (not asked for): it leaves focus on the canvas.
  const [panelFocus, setPanelFocus] = useState(true);
  const [compileDiagnostics, setCompileDiagnostics] = useState<readonly DslDiagnostic[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const iconToastFramesRef = useRef(new Set<string>());
  // The text last generated as a workspace. While the draft still equals it, the draft
  // follows the model (views, flows, relationships made outside the panel), so Generate
  // from an untouched draft never undoes them. Text the user typed is never replaced.
  const workspaceTextRef = useRef<string | null>(null);
  useEffect(() => {
    if (draft !== workspaceTextRef.current) return;
    const model = page ? archModelOfPage(page) : null;
    const text = model ? architectureWorkspaceText(model) : null;
    if (!text || text === draft) return;
    workspaceTextRef.current = text;
    setDraft(text);
  }, [page, draft]);

  const diagnostics = useMemo(() => {
    // compile() re-parses, so dedupe the live parse pass against the last generate.
    const seen = new Set<string>();
    return [...parse(draft).diagnostics, ...compileDiagnostics].filter((item) => {
      const key = `${item.code}:${item.line}:${item.col}:${item.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [draft, compileDiagnostics]);
  // Mermaid, Structurizr or D2 in the panel converts in place.
  const foreign = useMemo(() => detectForeign(draft), [draft]);
  const convertForeign = useCallback(() => {
    if (!foreign) return;
    const conversion = foreign.convert(draft);
    if ('error' in conversion) {
      setCompileDiagnostics([{ code: 'E003', severity: 'error', line: 1, col: 1, endCol: 1, message: conversion.error, source: 'parse' }]);
      return;
    }
    // A line the converter could not read (E004) keeps the source text, so its line numbers still point at it.
    setCompileDiagnostics(conversion.diagnostics);
    if (conversion.diagnostics.some((item) => item.severity === 'error')) {
      announce(`${foreign.label} not converted: fix the marked lines first.`);
      return;
    }
    setDraft(conversion.dsl);
    announce(`${foreign.label} converted${conversion.losses.length ? `. Not kept: ${conversion.losses.join('; ')}` : ''}.`);
  }, [draft, foreign, announce]);
  const canvasEdited = useMemo(() => {
    const scene = page && frameId ? frameScene(page, frameId) : null;
    return scene ? frameEdited(scene) : false;
  }, [page, frameId]);

  const edit = useCallback((text: string) => {
    setDraft(text);
    setCompileDiagnostics([]);
  }, []);
  /** Opens the panel on a new diagram rather than the last bound frame. */
  const openNew = useCallback(() => {
    setFrameId(null);
    setPanelFocus(true);
    openPanel();
  }, [openPanel]);
  const openFrame = useCallback((id: string) => {
    const scene = pageRef.current ? frameScene(pageRef.current, id) : null;
    if (!scene) return;
    const metadata = dslFrameRaw(scene.frame);
    const source = !frameEdited(scene) && typeof metadata.source === 'string'
      ? metadata.source
      : serialize({ frame: scene.frame, nodes: scene.nodes, groups: scene.groups ?? [], connectors: scene.connectors });
    // The picker follows the frame's authored palette so re-theming is explicit.
    const authored = (metadata.appearance as { palette?: unknown } | undefined)?.palette;
    if (isDiagramPalette(authored) && authored !== palette) onPaletteChange(authored);
    setDraft(source);
    setFrameId(id);
    setPanelFocus(true);
    openPanel();
  }, [pageRef, palette, onPaletteChange, openPanel]);

  // A new diagram is fitted once the renderer has its frame; regenerating keeps the camera.
  const [fitFrameId, setFitFrameId] = useState<string | null>(null);
  useEffect(() => {
    if (!fitFrameId || !hostRef.current?.getContentBounds([fitFrameId])) return;
    setFitFrameId(null);
    fitView([fitFrameId]);
  }, [fitFrameId, page, hostRef, fitView]);

  const offerIconRemoval = useCallback((targetId: string, inferred: number) => {
    // Said once per diagram: what the compiler added, with the way out beside it.
    if (!inferred || iconToastFramesRef.current.has(targetId)) return;
    iconToastFramesRef.current.add(targetId);
    const toastId = `auto-icons-${targetId}`;
    pushToast({
      id: toastId, tone: 'info',
      title: `${inferred} ${inferred === 1 ? 'icon' : 'icons'} added from labels.`,
      description: 'Right-click a node to remove one, or turn this off in Settings.',
      action: { label: 'Remove all', onClick: () => {
        dismissToast(toastId);
        const off = pageRef.current ? buildAutoIconsOffCommand(pageRef.current, targetId) : null;
        if (off) commit(off);
      } },
    });
  }, [pushToast, dismissToast, pageRef, commit]);

  /** Compiles `text` (the draft by default) into `target`, the bound frame unless a new diagram is asked for. True when it committed. */
  const generate = useCallback(async (text?: string, snaps?: Readonly<Record<string, WorkspaceSnap>>, target = frameId): Promise<boolean> => {
    const currentPage = pageRef.current;
    if (!currentPage || !document || readOnly || generating) return false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    try {
      // Mermaid, Structurizr or D2 converts first: compiled as DSL it parses into one node per line.
      const written = text ?? draft;
      const foreignSource = detectForeign(written);
      const attempt = foreignSource?.convert(written);
      if (attempt && 'error' in attempt) {
        setCompileDiagnostics([{ code: 'E003', severity: 'error', line: 1, col: 1, endCol: 1, message: attempt.error, source: 'parse' }]);
        return false;
      }
      const conversion = attempt && 'dsl' in attempt ? attempt : undefined;
      if (conversion?.diagnostics.some((item) => item.severity === 'error')) {
        setCompileDiagnostics(conversion.diagnostics);
        return false;
      }
      const source = conversion ? conversion.dsl : written;
      if (conversion) setDraft(source);
      const bound = target ? currentPage.nodes.find((node) => node.id === target) : undefined;
      const compiled = await compileWorkspace(source, {
        origin: bound?.transform.translation ?? nextDslFrameOrigin(currentPage),
        layout: elkDslLayoutPort, signal: controller.signal, resolveIcon: resolveDslIcon,
        // Panel defaults: an authored `appearance:` or `icons:` line wins.
        appearance: { palette }, autoIcons,
      });
      // Saved layout overrides win over ELK for the elements they name.
      const workspace = snaps ? applySnapsToWorkspace(compiled, snaps) : compiled;
      const primary = workspace.views[0]!.result;
      setCompileDiagnostics([...(conversion?.diagnostics ?? []), ...primary.diagnostics]);
      if (workspace.views.length > 1 || workspace.views[0]!.viewId.startsWith('view:')) {
        // A C4 workspace: one page per view, all pages in one undo step.
        const command = buildWorkspacePagesCommand(document, workspace, {
          mintId: mintV2Id, intoPageId: currentPage.id, ...(target ? { replaceFrameId: target } : {}),
        });
        if (command) commit(nameUntitledDocument(document, command, primary.meta.title));
        workspaceTextRef.current = source;
        setFrameId(null);
        // Regenerating from one of its view pages stays on that page; else land on the first view.
        const first = firstViewLanding(document, workspace, command, target ?? undefined, currentPage.id);
        if (first) {
          onViews(first.pageId);
          // The first view may have taken the page the user is on: no page switch to fit it.
          if (!target) setFitFrameId(first.frameId);
        }
        announce(`Generated ${workspace.views.length} views. Every element is shared across them.`);
        return Boolean(command);
      }
      const command = buildDslPageCommand(currentPage, primary, target ?? undefined);
      if (command) commit(nameUntitledDocument(document, command, primary.meta.title));
      const targetId = target ?? primary.frame.id;
      offerIconRemoval(targetId, primary.nodes.filter(hasAutoIcon).length);
      // A new diagram lands where the user can see it; regenerating keeps their camera.
      if (!target) setFitFrameId(targetId);
      setFrameId(targetId);
      applySelection(replaceSelection([targetId]));
      announce(`${primary.nodes.length} nodes generated${primary.diagnostics.some((item) => item.severity !== 'info') ? ' with diagnostics' : ''}.`);
      return Boolean(command);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        pushToast({ id: `dsl-${Date.now()}`, tone: 'danger', title: error instanceof Error ? error.message : 'Diagram generation failed.' });
      }
      return false;
    } finally {
      if (abortRef.current === controller) { abortRef.current = null; setGenerating(false); }
    }
  }, [pageRef, document, readOnly, generating, frameId, draft, palette, autoIcons, commit, onViews, announce, offerIconRemoval, applySelection, pushToast]);

  /** One template path for the canvas welcome, home's cards and the starter gallery. The Model panel's own button keeps itself open (`openPanel: false`). */
  const startFrom = useCallback((dsl: string, { openPanel: showPanel = true, baseline = false }: { openPanel?: boolean; baseline?: boolean } = {}) => {
    setFrameId(null);
    setDraft(dsl);
    if (showPanel) {
      focusCanvas?.();
      if (window.innerWidth >= PHONE_PX) { setPanelFocus(false); openPanel(); }
    }
    // A skipped generate committed nothing: the undo it would have replaced stays.
    void generate(dsl, undefined, null).then((committed) => { if (baseline && committed) forgetHistory?.(); });
  }, [openPanel, generate, focusCanvas, forgetHistory]);
  /** Writes the draft for a new diagram without opening the panel (the motion chips). */
  const writeNew = useCallback((update: (current: string) => string) => {
    setDraft(update);
    setFrameId(null);
  }, []);
  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return {
    draft, setDraft, edit, writeNew, generating, diagnostics, canvasEdited, panelFocus,
    foreign: foreign ? { label: foreign.label, convert: convertForeign } : null,
    openNew, openFrame, generate, startFrom, cancel,
  };
}
