import React, { useEffect, useState, memo, useMemo } from 'react';
import { ReactFlow, Background, BackgroundVariant } from '@/lib/reactflowCompat';
import { Loader2 } from 'lucide-react';
import { parseDslOrThrow } from '@/hooks/ai-generation/graphComposer';
import { getElkLayout } from '@/services/elkLayout';
import { flowCanvasNodeTypes, flowCanvasEdgeTypes } from '@/components/flow-canvas/flowCanvasTypes';
import type { FlowNode, FlowEdge } from '@/lib/types';

interface DiagramMiniPreviewProps {
  dsl: string;
  height?: number;
}

type ParsedOk = { nodes: FlowNode[]; edges: FlowEdge[] };
type ParsedErr = { error: string };

function parseDslSafe(dsl: string): ParsedOk | ParsedErr {
  try {
    const parsed = parseDslOrThrow(dsl);
    if (parsed.nodes.length === 0) return { error: 'No nodes to preview' };
    return parsed;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Parse failed' };
  }
}

function useElkLayout(
  parsed: ParsedOk | ParsedErr
):
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; nodes: FlowNode[]; edges: FlowEdge[] } {
  const [layout, setLayout] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'ready'; nodes: FlowNode[]; edges: FlowEdge[] }
  >({ status: 'loading' });

  useEffect(() => {
    if ('error' in parsed) return;
    let cancelled = false;
    getElkLayout(parsed.nodes, parsed.edges)
      .then(({ nodes, edges }) => {
        if (!cancelled) setLayout({ status: 'ready', nodes, edges });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLayout({
            status: 'error',
            error: err instanceof Error ? err.message : 'Layout failed',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [parsed]);

  if ('error' in parsed) return { status: 'error', error: parsed.error };
  return layout;
}

function DiagramMiniPreviewInner({
  dsl,
  height = 200,
}: DiagramMiniPreviewProps): React.ReactElement {
  const parsed = useMemo(() => parseDslSafe(dsl), [dsl]);
  const layout = useElkLayout(parsed);

  return (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]"
      style={{ height }}
    >
      {layout.status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-secondary)]" />
        </div>
      )}
      {layout.status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="text-[11px] text-[var(--brand-secondary)]">{layout.error}</p>
        </div>
      )}
      {layout.status === 'ready' && (
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={flowCanvasNodeTypes}
          edgeTypes={flowCanvasEdgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll={false}
          zoomOnPinch
          fitView
          fitViewOptions={{ padding: 0.2 }}
          className="bg-[var(--brand-background)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.2}
            color="color-mix(in srgb, var(--brand-secondary), transparent 85%)"
          />
        </ReactFlow>
      )}
    </div>
  );
}

export const DiagramMiniPreview = memo(function DiagramMiniPreview(props: DiagramMiniPreviewProps) {
  return <DiagramMiniPreviewInner key={props.dsl} {...props} />;
});
