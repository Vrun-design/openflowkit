import React, { useMemo } from 'react';
import { resolveNodeSize as resolveCanvasNodeSize } from '@/components/nodeHelpers';
import type { FlowNode } from '@/lib/types';
import type { FlowTemplate } from '@/services/templates';

const TEMPLATE_PREVIEW_MAX_NODES = 14;
const TEMPLATE_PREVIEW_PADDING = 28;
const TEMPLATE_PREVIEW_MIN_NODE_WIDTH = 44;
const TEMPLATE_PREVIEW_MIN_NODE_HEIGHT = 24;
const TEMPLATE_PREVIEW_MAX_NODE_WIDTH = 136;
const TEMPLATE_PREVIEW_MAX_NODE_HEIGHT = 72;

interface TemplatePreviewNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FlowNode['type'];
  shape?: FlowNode['data']['shape'];
  assetPresentation?: FlowNode['data']['assetPresentation'];
  seqParticipantKind?: FlowNode['data']['seqParticipantKind'];
}

interface TemplatePreviewEdge {
  id: string;
  source: string;
  target: string;
}

interface TemplateDiagramPreviewProps {
  template: FlowTemplate;
  className?: string;
}

export function TemplateDiagramPreview({
  template,
  className,
}: TemplateDiagramPreviewProps): React.ReactElement {
  const preview = useMemo(() => createTemplatePreview(template), [template]);
  const containerClassName = className ? `absolute inset-0 ${className}` : 'absolute inset-0';

  if (preview.nodes.length === 0) {
    const Icon = template.icon;
    return (
      <div className={containerClassName}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-primary)_5%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    );
  }

  const minX = Math.min(...preview.nodes.map((node) => node.x));
  const minY = Math.min(...preview.nodes.map((node) => node.y));
  const maxX = Math.max(...preview.nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...preview.nodes.map((node) => node.y + node.height));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const viewBox = `${minX - TEMPLATE_PREVIEW_PADDING} ${minY - TEMPLATE_PREVIEW_PADDING} ${width + TEMPLATE_PREVIEW_PADDING * 2} ${height + TEMPLATE_PREVIEW_PADDING * 2}`;

  return (
    <div className={`${containerClassName} overflow-hidden text-[var(--brand-secondary)]`}>
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-primary)_5%,transparent),transparent_60%)]" />
      <svg
        viewBox={viewBox}
        className="absolute inset-[9%] h-[82%] w-[82%]"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g opacity="0.38" stroke="currentColor" strokeWidth="2.5" fill="none">
          {preview.edges.map((edge) => {
            const source = preview.nodeIndex.get(edge.source);
            const target = preview.nodeIndex.get(edge.target);
            if (!source || !target) return null;
            const x1 = source.x + source.width / 2;
            const y1 = source.y + source.height / 2;
            const x2 = target.x + target.width / 2;
            const y2 = target.y + target.height / 2;
            return <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        {preview.nodes.map((node) => (
          <PreviewNodeShape key={node.id} node={node} variant={template.previewVariant} />
        ))}
      </svg>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_18px_var(--brand-background)] opacity-[0.88]" />
    </div>
  );
}

function PreviewNodeShape({
  node,
  variant,
}: {
  node: TemplatePreviewNode;
  variant?: FlowTemplate['previewVariant'];
}): React.ReactElement {
  const strokeOpacity = variant === 'asset-rich' ? 0.58 : 0.45;
  const fillOpacity = variant === 'asset-rich' ? 0.2 : 0.12;
  const fill = getPreviewNodeColor(node, variant);

  if (node.type === 'sequence_participant' || variant === 'sequence') {
    return (
      <g>
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={Math.min(node.height, 38)}
          rx={node.seqParticipantKind === 'actor' ? 18 : 12}
          fill={fill}
          fillOpacity={0.24}
          stroke="currentColor"
          strokeOpacity={strokeOpacity}
          strokeWidth="2"
        />
        <line
          x1={node.x + node.width / 2}
          y1={node.y + Math.min(node.height, 38)}
          x2={node.x + node.width / 2}
          y2={node.y + node.height + 110}
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeWidth="2"
          strokeDasharray="8 8"
        />
      </g>
    );
  }

  return (
    <rect
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      rx={getPreviewNodeRadius(node)}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke="currentColor"
      strokeOpacity={strokeOpacity}
      strokeWidth="2"
    />
  );
}

function createTemplatePreview(template: FlowTemplate): {
  nodes: TemplatePreviewNode[];
  edges: TemplatePreviewEdge[];
  nodeIndex: Map<string, TemplatePreviewNode>;
} {
  const nodes = template.nodes
    .filter((node) => !isPreviewContainerNode(node))
    .filter((node) => typeof node.position?.x === 'number' && typeof node.position?.y === 'number')
    .slice(0, TEMPLATE_PREVIEW_MAX_NODES)
    .map((node) => {
      const size = resolveCanvasNodeSize(node);
      return {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: clamp(size.width, TEMPLATE_PREVIEW_MIN_NODE_WIDTH, TEMPLATE_PREVIEW_MAX_NODE_WIDTH),
        height: clamp(size.height, TEMPLATE_PREVIEW_MIN_NODE_HEIGHT, TEMPLATE_PREVIEW_MAX_NODE_HEIGHT),
        type: node.type,
        shape: node.data?.shape,
        assetPresentation: node.data?.assetPresentation,
        seqParticipantKind: node.data?.seqParticipantKind,
      };
    });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = template.edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, 18)
    .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

  return {
    nodes,
    edges,
    nodeIndex: new Map(nodes.map((node) => [node.id, node])),
  };
}

function isPreviewContainerNode(node: FlowNode): boolean {
  return node.type === 'group' || node.type === 'section' || node.type === 'swimlane';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getPreviewNodeRadius(node: TemplatePreviewNode): number {
  if (node.assetPresentation === 'icon') {
    return 20;
  }
  if (node.shape === 'capsule') {
    return node.height / 2;
  }
  if (node.shape === 'diamond') {
    return 12;
  }
  if (node.shape === 'rectangle') {
    return 6;
  }
  return 16;
}

function getPreviewNodeColor(
  node: TemplatePreviewNode,
  variant?: FlowTemplate['previewVariant']
): string {
  if (node.assetPresentation === 'icon' || variant === 'asset-rich') {
    return 'color-mix(in_srgb, var(--brand-primary) 52%, white)';
  }
  if (node.type === 'annotation') {
    return 'color-mix(in_srgb, #f59e0b 74%, white)';
  }
  if (node.type === 'decision') {
    return 'color-mix(in_srgb, #f59e0b 68%, white)';
  }
  if (node.type === 'start' || node.type === 'end') {
    return 'color-mix(in_srgb, #10b981 56%, white)';
  }
  if (node.type === 'architecture') {
    return 'color-mix(in_srgb, var(--brand-primary) 38%, white)';
  }
  if (node.type === 'mindmap') {
    return 'color-mix(in_srgb, var(--brand-secondary) 30%, white)';
  }
  return 'currentColor';
}
