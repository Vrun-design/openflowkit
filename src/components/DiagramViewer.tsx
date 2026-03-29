import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, BackgroundVariant, ReactFlowProvider } from '@/lib/reactflowCompat';
import { ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { parseDslOrThrow } from '@/hooks/ai-generation/graphComposer';
import { getElkLayout } from '@/services/elkLayout';
import { flowCanvasNodeTypes, flowCanvasEdgeTypes } from './flow-canvas/flowCanvasTypes';
import { OpenFlowLogo } from './icons/OpenFlowLogo';
import type { FlowNode, FlowEdge } from '@/lib/types';

type ParsedGraph = ReturnType<typeof parseDslOrThrow>;
type ViewerSize = 'badge' | 'card' | 'full';
type LayoutState =
    | { status: 'loading' }
    | { status: 'error'; error: string }
    | { status: 'ready'; nodes: FlowNode[]; edges: FlowEdge[] };

function decodeDsl(encoded: string): string {
    return decodeURIComponent(atob(encoded));
}

function parseGraphFromSearch(search: string): ParsedGraph | { parseError: string } {
    const encoded = new URLSearchParams(search).get('flow');
    if (!encoded) return { parseError: 'No diagram data in URL. Add ?flow=BASE64_DSL to the URL.' };
    let dsl: string;
    try {
        dsl = decodeDsl(encoded);
    } catch {
        return { parseError: 'Could not decode diagram data. The URL may be malformed.' };
    }
    try {
        return parseDslOrThrow(dsl);
    } catch (err) {
        return { parseError: `DSL parse error: ${err instanceof Error ? err.message : String(err)}` };
    }
}

function parseViewerSize(search: string): ViewerSize {
    const size = new URLSearchParams(search).get('size');
    if (size === 'badge' || size === 'card') return size;
    return 'full';
}

function ViewerCanvas({
    nodes,
    edges,
    size,
}: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    size: ViewerSize;
}): React.ReactElement {
    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={flowCanvasNodeTypes}
            edgeTypes={flowCanvasEdgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll={false}
            zoomOnPinch
            fitView
            fitViewOptions={{ padding: size === 'badge' ? 0.08 : size === 'card' ? 0.12 : 0.15 }}
            className="bg-[var(--brand-background,#f8fafc)]"
        >
            <Background variant={BackgroundVariant.Dots} gap={24} size={size === 'badge' ? 1.3 : 1.9} color="color-mix(in srgb, var(--brand-secondary), transparent 80%)" />
            {size === 'full' ? <Controls showInteractive={false} /> : null}
        </ReactFlow>
    );
}

function DiagramViewerInner(): React.ReactElement {
    const location = useLocation();
    const navigate = useNavigate();
    const viewerSize = parseViewerSize(location.search);

    // Parse synchronously once on mount via lazy initializer — no effect needed.
    const [parsed] = useState<ParsedGraph | { parseError: string }>(() =>
        parseGraphFromSearch(location.search)
    );

    const [layoutState, setLayoutState] = useState<LayoutState>(() =>
        'parseError' in parsed
            ? { status: 'error', error: parsed.parseError }
            : { status: 'loading' }
    );

    // Run layout asynchronously — only when parse succeeded.
    useEffect(() => {
        if ('parseError' in parsed) return;
        getElkLayout(parsed.nodes, parsed.edges)
            .then(({ nodes, edges }) => {
                setLayoutState({ status: 'ready', nodes, edges });
            })
            .catch((err: unknown) => {
                setLayoutState({ status: 'error', error: `Layout failed: ${err instanceof Error ? err.message : String(err)}` });
            });
    }, [parsed]);

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--brand-background)]">
            {viewerSize !== 'badge' ? (
            <div className={`flex shrink-0 items-center justify-between border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)]/90 px-4 backdrop-blur ${viewerSize === 'card' ? 'h-9' : 'h-10'}`}>
                <div className="flex items-center gap-2">
                    <OpenFlowLogo className="h-5 w-5 text-[var(--brand-primary,#e95420)]" />
                    <span className="text-xs font-semibold text-[var(--brand-secondary)]">{viewerSize === 'card' ? 'OpenFlowKit Viewer' : 'OpenFlowKit'}</span>
                </div>
                <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-1 text-[11px] font-medium text-[var(--brand-secondary)] shadow-sm transition-all hover:border-[var(--brand-primary,#e95420)] hover:text-[var(--brand-primary,#e95420)] active:scale-95"
                >
                    <ExternalLink className="h-3 w-3" />
                    Open in Editor
                </button>
            </div>
            ) : (
            <div className="flex h-7 shrink-0 items-center justify-between border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)]/90 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-secondary)]">
                <span>OpenFlowKit</span>
                <span>Badge Viewer</span>
            </div>
            )}

            <div className="relative min-h-0 flex-1">
                {layoutState.status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-secondary)]" />
                    </div>
                )}
                {layoutState.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                            <p className="text-sm font-medium text-amber-800">Could not render diagram</p>
                            <p className="text-xs text-amber-600">{layoutState.error}</p>
                        </div>
                    </div>
                )}
                {layoutState.status === 'ready' && (
                    <ViewerCanvas nodes={layoutState.nodes} edges={layoutState.edges} size={viewerSize} />
                )}
            </div>
        </div>
    );
}

export function DiagramViewer(): React.ReactElement {
    return (
        <ReactFlowProvider>
            <DiagramViewerInner />
        </ReactFlowProvider>
    );
}

/** Encode a DSL string to a viewer URL param. */
export function encodeDslForViewer(dsl: string): string {
    return btoa(encodeURIComponent(dsl));
}
