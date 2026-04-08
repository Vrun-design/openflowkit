import { setNodeParent } from './nodeParent';
import { NODE_DEFAULTS } from '../theme';
import type { FlowEdge, FlowNode, NodeData } from './types';
import { KNOWN_PROVIDER_PACK_IDS } from '@/services/shapeLibrary/providerCatalog';

function resolveArchPackId(provider: string): string {
  return KNOWN_PROVIDER_PACK_IDS[provider.toLowerCase()] ?? `${provider}-processed-pack-v1`;
}

// --- Types ---

export interface DSLNode {
  id: string;
  type: string;
  label: string;
  parentId?: string;
  attributes: Record<string, DSLAttributeValue>;
}

export interface DSLEdge {
  sourceId: string;
  targetId: string;
  label?: string;
  attributes: Record<string, DSLAttributeValue>;
  type?: 'default' | 'step' | 'smoothstep' | 'straight';
}

export interface DSLResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata: Record<string, string>;
  errors: string[];
}

type DSLAttributeValue = string | number | boolean;

// --- Constants ---

const NODE_TYPE_MAP: Record<string, string> = {
  start: 'start',
  process: 'process',
  decision: 'decision',
  end: 'end',
  system: 'custom',
  note: 'annotation',
  section: 'process',
  group: 'process',
  browser: 'browser',
  mobile: 'mobile',
  container: 'container',
  architecture: 'custom',
};

// --- Helpers ---

function parseAttributes(text: string): Record<string, DSLAttributeValue> {
  const attributes: Record<string, DSLAttributeValue> = {};
  if (!text) return attributes;

  const content = text.trim();
  if (!content.startsWith('{') || !content.endsWith('}')) return attributes;

  const inner = content.slice(1, -1);
  const pairs: string[] = [];
  let buffer = '';
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of inner) {
    if (escaping) {
      buffer += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      buffer += char;
      escaping = true;
      continue;
    }

    if (quote) {
      buffer += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === ',') {
      const pair = buffer.trim();
      if (pair) pairs.push(pair);
      buffer = '';
      continue;
    }

    buffer += char;
  }

  const trailingPair = buffer.trim();
  if (trailingPair) {
    pairs.push(trailingPair);
  }

  pairs.forEach((pair) => {
    let colonIndex = -1;
    let pairQuote: '"' | "'" | null = null;
    let pairEscaping = false;

    for (let index = 0; index < pair.length; index += 1) {
      const char = pair[index];

      if (pairEscaping) {
        pairEscaping = false;
        continue;
      }

      if (char === '\\') {
        pairEscaping = true;
        continue;
      }

      if (pairQuote) {
        if (char === pairQuote) {
          pairQuote = null;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        pairQuote = char;
        continue;
      }

      if (char === ':') {
        colonIndex = index;
        break;
      }
    }

    if (colonIndex <= 0) return;

    const key = pair.slice(0, colonIndex).trim();
    const rawValue = pair.slice(colonIndex + 1).trim();
    if (!key || !rawValue) return;

    let value: DSLAttributeValue = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value
        .slice(1, -1)
        .replace(/\\(["'])/g, '$1')
        .replace(/\\\\/g, '\\');
    } else if (!Number.isNaN(Number(value))) {
      value = Number(value);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }

    attributes[key] = value;
  });

  return attributes;
}

// --- Parser ---

export function parseOpenFlowDslV2(input: string): DSLResult {
  const dslNodes: DSLNode[] = [];
  const dslEdges: DSLEdge[] = [];
  const metadata: Record<string, string> = { direction: 'TB' };
  const errors: string[] = [];

  const lines = input.split('\n');
  const currentGroupStack: string[] = [];

  // First pass: symbols and structure
  // We need map label -> ID for implicit IDs
  const labelToIdMap = new Map<string, string>();

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;

    // 1. Metadata: key: value
    const metadataMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.+)$/);
    // Avoid matching "label: value" inside node defs, heuristic: no brackets, no arrow
    if (metadataMatch && !line.includes('[') && !line.includes('->')) {
      const key = metadataMatch[1].toLowerCase();
      let value = metadataMatch[2].trim();
      // Strip quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
      return;
    }

    // 2. Groups Start: group "Label" {
    const groupStartMatch = line.match(/^group\s+"?([^"{]+)"?\s*\{$/);
    if (groupStartMatch) {
      currentGroupStack.push(groupStartMatch[1]);
      return;
    }

    // 3. Group End: }
    if (line === '}') {
      if (currentGroupStack.length > 0) {
        currentGroupStack.pop();
      } else {
        errors.push(`Line ${lineIndex + 1}: Unexpected '}'`);
      }
      return;
    }

    // 4. Edges: A -> B { attrs }
    // regex: (source) (arrow) (target) (attrs?)
    const edgeMatch = line.match(/^(.+?)\s*(->|-->|\.\.>|==>)\s*(.+?)(\s*\{.*\})?$/);
    if (edgeMatch) {
      // Note: We intentionally catch lines starting with '[' here if they have an arrow.
      // This handles cases where AI mistakenly writes "[type] Node -> Node".

      const [, sourceRaw, arrow, targetRaw, attrsRaw] = edgeMatch;

      // Helper to clean potential [type] prefixes from IDs in edges
      const cleanId = (raw: string) => {
        const typeMatch = raw.match(/^\[.*?\]\s*(.+)$/);
        return (typeMatch ? typeMatch[1] : raw).trim();
      };

      // Extract labels/IDs from potential piped text: Source ->|Label| Target
      // Re-parsing source/target for piped labels if valid arrow syntax
      // "A ->|yes| B"
      const source = cleanId(sourceRaw.trim());
      let targetRawTrimmed = targetRaw.trim();
      let label = '';

      const pipeMatch = targetRawTrimmed.match(/^\|([^|]+)\|\s*(.+)$/);
      if (pipeMatch) {
        label = pipeMatch[1];
        targetRawTrimmed = pipeMatch[2].trim();
      }
      const target = cleanId(targetRawTrimmed);

      // Attributes
      const attributes = parseAttributes(attrsRaw || '');

      // Arrow styling
      if (arrow === '-->') attributes.styleType = 'curved';
      if (arrow === '..>') attributes.styleType = 'dashed';
      if (arrow === '==>') attributes.styleType = 'thick';

      dslEdges.push({
        sourceId: source, // Resolved later
        targetId: target, // Resolved later
        label,
        attributes,
      });
      return;
    }

    // 5. Nodes: [type] id: Label { attrs }
    const nodeMatch = line.match(
      /^\[([a-zA-Z0-9_]+)\]\s*(?:([a-zA-Z0-9_]+):\s*)?([^{]+)(\s*\{.*\})?$/
    );
    if (nodeMatch) {
      const [, typeRaw, idRaw, labelRaw, attrsRaw] = nodeMatch;
      const type = NODE_TYPE_MAP[typeRaw.toLowerCase()] || 'process';
      const label = labelRaw.trim();
      const id = idRaw ? idRaw.trim() : label; // If no explicit ID, use label (backward compact)

      const attributes = parseAttributes(attrsRaw || '');

      const node: DSLNode = {
        id,
        type,
        label,
        attributes,
      };

      dslNodes.push(node);
      labelToIdMap.set(label, id); // Map label to ID for edge resolution
      labelToIdMap.set(id, id); // Map ID to ID
      return;
    }

    errors.push(`Line ${lineIndex + 1}: Unrecognized syntax "${line}"`);
  });

  if (currentGroupStack.length > 0) {
    errors.push(`Line ${lines.length}: Unclosed group block (missing closing "}")`);
  }

  // Post-processing: Resolve implicit nodes and edge IDs
  const finalNodes: FlowNode[] = [];
  const finalEdges: FlowEdge[] = [];
  const createdNodeIds = new Set<string>();

  // 1. Process explicit nodes
  dslNodes.forEach((n) => {
    const defaultStyle = NODE_DEFAULTS[n.type] || NODE_DEFAULTS['process'];

    // Layout placeholder (will be handled by ELK layout)
    let node: FlowNode = {
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        shape: defaultStyle?.shape as NodeData['shape'],
        color: defaultStyle?.color,
        icon: defaultStyle?.icon && defaultStyle.icon !== 'none' ? defaultStyle.icon : undefined,
        ...n.attributes,
        ...(n.attributes.archProvider
          ? { archIconPackId: resolveArchPackId(String(n.attributes.archProvider)) }
          : {}),
        ...(n.attributes.archResourceType
          ? { archIconShapeId: String(n.attributes.archResourceType) }
          : {}),
        ...(n.attributes.archResourceType ? { assetPresentation: 'icon' as const } : {}),
      },
    };
    if (n.parentId) {
      node = setNodeParent(node, n.parentId, {
        constrainToParent: false,
      });
    }
    finalNodes.push(node);
    createdNodeIds.add(n.id);
  });

  // 2. Process edges and create implicit nodes
  dslEdges.forEach((e, i) => {
    const sourceId = labelToIdMap.get(e.sourceId) || e.sourceId;
    const targetId = labelToIdMap.get(e.targetId) || e.targetId;

    const ensureNode = (nodeId: string) => {
      if (createdNodeIds.has(nodeId)) return;
      const style = NODE_DEFAULTS['process'];
      finalNodes.push({
        id: nodeId,
        type: 'process',
        position: { x: 0, y: 0 },
        data: {
          label: nodeId,
          shape: style?.shape as NodeData['shape'],
          color: style?.color,
          icon: style?.icon && style.icon !== 'none' ? style.icon : undefined,
        },
      });
      createdNodeIds.add(nodeId);
      labelToIdMap.set(nodeId, nodeId);
    };

    ensureNode(sourceId);
    ensureNode(targetId);

    const finalEdge: FlowEdge = {
      id: `edge-${i}`, // Unique ID for the edge
      source: sourceId,
      target: targetId,
      label: e.label,
      type: 'default', // Default edge type
      data: { label: e.label },
    };

    // Merge attributes into edge data or style
    if (Object.keys(e.attributes).length > 0) {
      finalEdge.data = { ...finalEdge.data, ...e.attributes };

      // Map 'style' attribute to styleType for convenience/tests
      const styleType = e.attributes.styleType || e.attributes.style;

      // Handle specific style mappings if needed
      if (styleType === 'curved') {
        finalEdge.type = 'smoothstep';
        finalEdge.data.styleType = 'curved';
      } else if (styleType === 'dashed') {
        finalEdge.style = { strokeDasharray: '5 5' };
        finalEdge.data.styleType = 'dashed';
      } else if (styleType === 'thick') {
        finalEdge.style = { strokeWidth: 3 };
        finalEdge.data.styleType = 'thick';
      }
    }
    finalEdges.push(finalEdge);
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
    metadata,
    errors,
  };
}

export const parseFlowMindDSL = parseOpenFlowDslV2;
