import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasSelection } from '../application/selection/selection';
import {
  buildSemanticSceneItems,
  semanticScenePageForItem,
  SEMANTIC_SCENE_PAGE_SIZE,
  type SemanticSceneItem,
} from '../application/selection/semanticScene';
import { arrowSpatialDirection, spatialNeighborId } from '../application/selection/spatialNavigation';
import type { ScenePage } from '../domain/document/types';

interface OpenCanvasSemanticSceneTreeProps {
  readonly page: ScenePage;
  readonly selection: CanvasSelection;
  readonly selectedConnectorId: string | null;
  readonly onSelectNode: (nodeId: string, additive: boolean) => void;
  readonly onSelectConnector: (connectorId: string) => void;
}

function itemKey(item: SemanticSceneItem): string {
  return `${item.kind}:${item.id}`;
}

export function OpenCanvasSemanticSceneTree(
  props: OpenCanvasSemanticSceneTreeProps
): React.JSX.Element {
  const items = useMemo(() => buildSemanticSceneItems(props.page), [props.page]);
  const [pageIndex, setPageIndex] = useState(0);
  const selectedKind = props.selection.primaryNodeId ? 'node' : 'connector';
  const selectedId = props.selection.primaryNodeId ?? props.selectedConnectorId;
  const selectedKey = selectedId ? `${selectedKind}:${selectedId}` : null;
  const [followedSelectionKey, setFollowedSelectionKey] = useState(selectedKey);
  const pendingFocusKeyRef = useRef<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const pageCount = Math.max(1, Math.ceil(items.length / SEMANTIC_SCENE_PAGE_SIZE));
  const boundedPageIndex = Math.min(pageIndex, pageCount - 1);
  const startIndex = boundedPageIndex * SEMANTIC_SCENE_PAGE_SIZE;
  const pageItems = useMemo(
    () => items.slice(startIndex, startIndex + SEMANTIC_SCENE_PAGE_SIZE),
    [items, startIndex]
  );

  if (selectedKey !== followedSelectionKey) {
    setFollowedSelectionKey(selectedKey);
    if (selectedId) {
      const targetPage = semanticScenePageForItem(items, selectedKind, selectedId);
      if (targetPage !== null && targetPage !== pageIndex) setPageIndex(targetPage);
    }
  }

  const focusItem = (item: SemanticSceneItem): void => {
    const targetPage = semanticScenePageForItem(items, item.kind, item.id);
    if (targetPage === null) return;
    const key = itemKey(item);
    if (targetPage === boundedPageIndex) {
      itemRefs.current.get(key)?.focus();
      return;
    }
    pendingFocusKeyRef.current = key;
    setPageIndex(targetPage);
  };

  useEffect(() => {
    const pendingFocusKey = pendingFocusKeyRef.current;
    if (!pendingFocusKey) return;
    const target = itemRefs.current.get(pendingFocusKey);
    if (!target) return;
    target.focus();
    pendingFocusKeyRef.current = null;
  }, [boundedPageIndex, pageItems]);

  const navigateConnector = (item: SemanticSceneItem, offset: number): void => {
    const connectors = items.filter((candidate) => candidate.kind === 'connector');
    const index = connectors.findIndex((candidate) => candidate.id === item.id);
    const next = connectors[Math.min(connectors.length - 1, Math.max(0, index + offset))];
    if (!next) return;
    props.onSelectConnector(next.id);
    focusItem(next);
  };

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    item: SemanticSceneItem
  ): void => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (item.kind === 'node') {
      const direction = arrowSpatialDirection(event.key);
      if (!direction) return;
      const nextId = spatialNeighborId(props.page, item.id, direction);
      const next = items.find((candidate) => candidate.kind === 'node' && candidate.id === nextId);
      if (!next) return;
      props.onSelectNode(next.id, false);
      focusItem(next);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      navigateConnector(item, 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      navigateConnector(item, -1);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <nav className="sr-only" aria-label="Canvas semantic scene">
      <p aria-live="polite">
        Objects {items.length === 0 ? 0 : startIndex + 1}–{
          Math.min(items.length, startIndex + pageItems.length)
        } of {items.length}
      </p>
      <ol>
        {pageItems.map((item, itemIndex) => {
          const key = itemKey(item);
          const descriptionId = `opencanvas-semantic-description-${startIndex + itemIndex}`;
          const selected = item.kind === 'node'
            ? props.selection.nodeIds.includes(item.id)
            : props.selectedConnectorId === item.id;
          return (
            <li key={key}>
              <button
                ref={(element) => {
                  if (element) itemRefs.current.set(key, element);
                  else itemRefs.current.delete(key);
                }}
                type="button"
                data-canvas-semantic-node={item.kind === 'node' ? 'true' : undefined}
                aria-pressed={selected}
                aria-describedby={descriptionId}
                onClick={(event) => {
                  if (item.kind === 'node') {
                    props.onSelectNode(item.id, event.shiftKey || event.metaKey || event.ctrlKey);
                  } else props.onSelectConnector(item.id);
                }}
                onKeyDown={(event) => handleItemKeyDown(event, item)}
              >
                {item.kind === 'node' ? `Select ${item.label}` : `Select connector ${item.label}`}
              </button>
              <span id={descriptionId}>{item.description}</span>
            </li>
          );
        })}
      </ol>
      {pageCount > 1 ? (
        <div role="group" aria-label="Semantic scene pages">
          <button type="button" disabled={boundedPageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}>
            Previous objects
          </button>
          <span>Page {boundedPageIndex + 1} of {pageCount}</span>
          <button type="button" disabled={boundedPageIndex >= pageCount - 1}
            onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}>
            Next objects
          </button>
        </div>
      ) : null}
    </nav>
  );
}
