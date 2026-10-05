import { useEffect, useState } from 'react';
import type { ScenePage } from '../../domain/document/types';
import { TIP_QUIET_MS, V2_TIPS, markTipSeen, mayShowTip, recordTipShown, type V2TipId } from './v2FeatureTips';
import type { V2WorkspaceMode } from './V2Workspace';

export interface V2FeatureTipsOptions {
  readonly page: ScenePage | null;
  readonly readOnly: boolean;
  readonly rendererReady: boolean;
  readonly selectedCount: number;
  readonly aiConfigured: boolean;
  readonly workspace: V2WorkspaceMode | null;
  readonly motionOpen: boolean;
  /** Any panel, menu or label editor open: not the moment for a tip. */
  readonly blocked: boolean;
  readonly announce: (message: string) => void;
}

/** One hint at the moment it pays off, at most one a session, never twice. */
export function useV2FeatureTips(options: V2FeatureTipsOptions) {
  const { page, readOnly, rendererReady, selectedCount, aiConfigured, workspace, motionOpen, blocked, announce } = options;
  const [tip, setTip] = useState<V2TipId | null>(null);

  const offer = (id: V2TipId) => {
    // Never over an open panel, menu or dialog (passive tooltips do not count).
    if (tip || !mayShowTip(id) || document.querySelector('.ofk-panel, .ofk-popover:not([data-passive]), dialog[open]')) return;
    recordTipShown(id);
    setTip(id);
    announce(`Tip: ${V2_TIPS[id].title}. ${V2_TIPS[id].text}`);
  };

  // Using a feature is learning it: its tip is never offered after that.
  useEffect(() => {
    if (workspace === 'code') { markTipSeen('code'); markTipSeen('mermaid'); }
    if (workspace === 'assistant') markTipSeen('assistant');
    if (motionOpen) markTipSeen('motion');
    if (page && page.connectors.length > 0) markTipSeen('connect');
    if (blocked) setTip(null);
  }, [workspace, motionOpen, page, blocked]);

  // Offered after a quiet moment: drawing a shape opens its label editor a render later, and a tip
  // must not appear just to be swept away by it. Any change in between restarts the wait.
  useEffect(() => {
    if (!page || readOnly || !rendererReady || blocked) return;
    const generated = page.nodes.some((node) => node.kind === 'frame');
    const id: V2TipId | null = page.nodes.length >= 3 && !generated ? 'code'
      : page.nodes.length >= 5 && !aiConfigured ? 'assistant'
        : selectedCount === 2 && page.connectors.length === 0 ? 'connect' : null;
    if (!id || !mayShowTip(id)) return;
    const timer = window.setTimeout(() => offer(id), TIP_QUIET_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offer reads the latest state; these are the triggers
  }, [page, selectedCount, rendererReady, blocked, aiConfigured]);

  return { tip, offer, dismiss: () => setTip(null) };
}
