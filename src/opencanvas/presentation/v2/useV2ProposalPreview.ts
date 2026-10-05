import { useEffect, useMemo, type RefObject } from 'react';
import type { Proposal } from '../../application/ai/proposalSession';
import type { Bounds2d } from '../../domain/geometry/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import type { useV2Proposal } from './useV2Proposal';

/** Objects a proposed change touches, to highlight while it is hovered in review. */
function changeObjectIds(changeId: string, proposal: Proposal | null): readonly string[] {
  const change = proposal?.changes.find(({ id }) => id === changeId);
  if (!change) return [];
  const commands = change.command.kind === 'batch' ? change.command.commands : [change.command];
  return commands.flatMap((command) => {
    switch (command.kind) {
      case 'insert-node': case 'remove-node': return [command.node.id];
      case 'set-node': return [command.after.id];
      case 'insert-connector': case 'remove-connector':
        return [command.connector.source.nodeId, command.connector.target.nodeId].filter((id): id is string => !!id);
      case 'set-connector':
        return [command.after.source.nodeId, command.after.target.nodeId].filter((id): id is string => !!id);
      // A diagram row: nodes it keeps are the same objects, so new identity = added or rebuilt.
      case 'set-page': return command.after.nodes.filter((node) => !command.before.nodes.includes(node)).map(({ id }) => id);
      default: return [];
    }
  });
}

/**
 * Ghosts a reviewable proposal on the canvas, highlights the hovered change, and
 * brings a proposal that lands off screen (or under the panel) into view once.
 * Returns the ghosted page, or null when nothing is under review.
 */
export function useV2ProposalPreview(
  proposal: ReturnType<typeof useV2Proposal>,
  hostRef: RefObject<PixiRendererHost | null>,
  rendererReady: boolean,
  revealBounds: (bounds: Bounds2d) => void,
) {
  const ghostPage = proposal.phase === 'ready' && !proposal.stale && proposal.proposal
    ? proposal.proposal.preview.pages[0] ?? null : null;
  const highlightIds = useMemo(
    () => (proposal.highlightedChangeId ? changeObjectIds(proposal.highlightedChangeId, proposal.proposal) : []),
    [proposal.highlightedChangeId, proposal.proposal]);

  const ghostId = ghostPage ? proposal.proposal?.id : null;
  useEffect(() => {
    if (!ghostPage || !rendererReady) return;
    const tops = ghostPage.nodes.filter((node) => !node.parentId);
    if (!tops.length) return;
    const x = Math.min(...tops.map((node) => node.transform.translation.x));
    const y = Math.min(...tops.map((node) => node.transform.translation.y));
    revealBounds({
      x, y,
      width: Math.max(...tops.map((node) => node.transform.translation.x + node.size.width)) - x,
      height: Math.max(...tops.map((node) => node.transform.translation.y + node.size.height)) - y,
    });
    // Once per proposal, not per render of its ghost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostId, rendererReady]);
  useEffect(() => {
    if (rendererReady) hostRef.current?.setProposalPreview(ghostPage ? { page: ghostPage, highlightIds } : null);
  }, [ghostPage, highlightIds, rendererReady, hostRef]);

  return ghostPage;
}
