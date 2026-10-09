import { useMemo } from 'react';
import type { AggEdge, MapModel } from '../../../dsl/map/types';
import { githubEvidenceLink, githubPathLink } from '../../../services/discovery/githubRepo';
import { repoMapPageOf, repoMapSourceOf, sameRepoMapAddress, withRepoMapSource, type RepoMapSource } from '../../application/map/repoMapSource';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { MapBoxData } from './map/MapBoxPanel';
import type { MapRepoArrow } from './map/MapArrowEvidence';
import { useRepoMap } from './map/useRepoMap';
import type { V2StartIntent } from './v2Document';

type RepoIntent = Extract<V2StartIntent, { repoMap: unknown }>['repoMap'];

/**
 * A repo document keeps only its address (`metadata.map.source`); the facts are read here, in memory (and from the
 * IndexedDB cache after the first read while online). Its map page is read-only end to end: nothing the reader can do edits it.
 */
export function useV2RepoDocument(document: SceneDocumentV1 | null, intent: V2StartIntent | null) {
  const source = useMemo(() => (document ? repoMapSourceOf(document) : null), [document]);
  const state = useRepoMap(source);
  const repoIntent: RepoIntent | null = intent && 'repoMap' in intent ? intent.repoMap : null;
  /** For `useV2DocumentLoad`: a repo map is born with its address and named for the repo. */
  const initialize = repoIntent ? (fresh: SceneDocumentV1) => ({ ...withRepoMapSource(fresh, repoIntent), name: `${repoIntent.owner}/${repoIntent.repo}` }) : undefined;
  // A stored document under this id that is another repo's: say so rather than show the wrong map.
  const mismatch = repoIntent !== null && source !== null && !sameRepoMapAddress(repoIntent, source);
  // The repo's own map page, recorded in the document's metadata when it was made (first page for one saved before that): the
  // only page that stays read-only. Any other page of the document is an ordinary Canvas page. A marker naming a page that
  // is gone fails closed: the whole document is read-only.
  const marker = source && document ? repoMapPageOf(document) : null;
  const lockedPageId = source && document ? marker ?? document.pages[0]?.id ?? null : null;
  const broken = source !== null && document !== null && lockedPageId !== null && !document.pages.some((page) => page.id === lockedPageId);
  return { source, state, initialize, mismatch, lockedPageId, broken };
}

interface PanelOptions {
  readonly source: RepoMapSource | null;
  readonly map: {
    readonly active: boolean; readonly error: string | null; readonly model: MapModel | null;
    readonly edgeOf: (connectorId: string) => AggEdge | undefined; readonly edgesAt: (id: string) => AggEdge[]; readonly reveal: (id: string) => boolean;
  };
  /** What the reader has selected: one box, one arrow, or neither. */
  readonly selectedBoxId: string | null;
  readonly selectedConnectorId: string | null;
  readonly selectArrow: (key: string) => void;
}

/** Whether there is a map to draw (so a toolbar and find make sense), the arrow's evidence and the selected box's details. */
export function useV2RepoPanel({ source, map, selectedBoxId, selectedConnectorId, selectArrow }: PanelOptions) {
  const { model, edgeOf, edgesAt, reveal } = map;
  const drawable = !source || (model !== null && model.nodes[model.root].children.length > 0);
  const drawn = map.active && !map.error && drawable;
  const ref = useMemo(() => (source ? { owner: source.owner, repo: source.repo, ref: source.ref ?? 'HEAD' } : null), [source]);
  const arrow = useMemo((): MapRepoArrow | null => {
    const edge = ref && model && selectedConnectorId ? edgeOf(selectedConnectorId) : undefined;
    if (!ref || !model || !edge) return null;
    // Links name the ref the facts were read at ('HEAD' = the default branch), never the tree sha.
    const link = githubEvidenceLink(ref);
    return { edge, link: (file, line) => link({ file, line }), name: (id) => model.nodes[id]?.name ?? id };
  }, [ref, model, selectedConnectorId, edgeOf]);
  const node = ref && drawn && model && selectedBoxId && !selectedConnectorId ? model.nodes[selectedBoxId] : undefined;
  const box: MapBoxData | null = ref && model && node ? {
    model, id: node.id, edges: edgesAt(node.id), onSelect: reveal, onSelectArrow: selectArrow,
    pathLink: node.path ? githubPathLink(ref, node.path, node.kind !== 'file') : null,
  } : null;
  return { drawn, arrow, box };
}
