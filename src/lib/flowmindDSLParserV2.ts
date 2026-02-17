import { Node, Edge } from 'reactflow';

// --- Types ---

export interface DSLNode {
    id: string;
    type: string;
    label: string;
    parentId?: string;
    attributes: Record<string, any>;
}

export interface DSLEdge {
    sourceId: string;
    targetId: string;
    label?: string;
    attributes: Record<string, any>;
    type?: 'default' | 'step' | 'smoothstep' | 'straight';
}

export interface DSLResult {
    nodes: Node[];
    edges: Edge[];
    metadata: Record<string, any>;
    errors: string[];
}

// --- Constants ---

const NODE_TYPE_MAP: Record<string, string> = {
    start: 'start',
    process: 'process',
    decision: 'decision',
    end: 'end',
    system: 'custom',
    note: 'annotation',
    section: 'section',
    browser: 'browser',
    mobile: 'mobile',
    button: 'wireframe_button',
    input: 'wireframe_input',
    icon: 'icon',
    placeholder: 'wireframe_image',
    container: 'container', // New generic container
};

// --- Helpers ---

const parseAttributes = (text: string): Record<string, any> => {
    const attributes: Record<string, any> = {};
    if (!text) return attributes;

    // Simple parser for { key: "value", key2: 123 }
    // Remove wrapping braces
    const content = text.trim();
    if (!content.startsWith('{') || !content.endsWith('}')) return attributes;

    const inner = content.slice(1, -1);
    const pairs = inner.split(',').map(p => p.trim()).filter(Boolean);

    pairs.forEach(pair => {
        const [key, rawValue] = pair.split(':').map(s => s.trim());
        if (!key || !rawValue) return;

        let value: any = rawValue;
        // String
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        // Number
        else if (!isNaN(Number(value))) {
            value = Number(value);
        }
        // Boolean
        else if (value === 'true') value = true;
        else if (value === 'false') value = false;

        attributes[key] = value;
    });

    return attributes;
};

// --- Parser ---

export const parseFlowMindDSL = (input: string): DSLResult => {
    const dslNodes: DSLNode[] = [];
    const dslEdges: DSLEdge[] = [];
    const metadata: Record<string, any> = { direction: 'TB' };
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
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            metadata[key] = value;
            return;
        }

        // 2. Groups Start: group "Label" {
        const groupStartMatch = line.match(/^group\s+"?([^"{]+)"?\s*\{$/);
        if (groupStartMatch) {
            const label = groupStartMatch[1];
            const id = `group-${dslNodes.length}`;

            dslNodes.push({
                id,
                type: 'group', // Generic group type, mapped to valid ReactFlow type later
                label,
                attributes: {},
                parentId: currentGroupStack.length > 0 ? currentGroupStack[currentGroupStack.length - 1] : undefined
            });

            currentGroupStack.push(id);
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
                attributes
            });
            return;
        }

        // 5. Nodes: [type] id: Label { attrs }
        const nodeMatch = line.match(/^\[([a-zA-Z0-9_]+)\]\s*(?:([a-zA-Z0-9_]+):\s*)?([^{]+)(\s*\{.*\})?$/);
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
                parentId: currentGroupStack.length > 0 ? currentGroupStack[currentGroupStack.length - 1] : undefined
            };

            dslNodes.push(node);
            labelToIdMap.set(label, id); // Map label to ID for edge resolution
            labelToIdMap.set(id, id);    // Map ID to ID
            return;
        }
    });

    // Post-processing: Resolve implicit nodes and edge IDs
    const finalNodes: Node[] = [];
    const finalEdges: Edge[] = [];
    const createdNodeIds = new Set<string>();

    // 1. Process explicit nodes
    dslNodes.forEach((n) => {
        // Layout placeholder (will be handled by ELK layout)
        finalNodes.push({
            id: n.id,
            type: n.type,
            position: { x: 0, y: 0 },
            data: {
                label: n.label,
                ...n.attributes
            },
            parentId: n.parentId,
            extent: n.parentId ? 'parent' : undefined
        });
        createdNodeIds.add(n.id);
    });

    // 2. Process edges and create implicit nodes
    dslEdges.forEach((e, i) => {
        const sourceId = labelToIdMap.get(e.sourceId) || e.sourceId;
        const targetId = labelToIdMap.get(e.targetId) || e.targetId;

        // If nodes parse as "A -> B" and A wasn't defined, create a default process node
        if (!createdNodeIds.has(sourceId)) {
            finalNodes.push({
                id: sourceId,
                type: 'process',
                position: { x: 0, y: 0 },
                data: { label: sourceId }
            });
            createdNodeIds.add(sourceId);
            labelToIdMap.set(sourceId, sourceId);
        }
        if (!createdNodeIds.has(targetId)) {
            finalNodes.push({
                id: targetId,
                type: 'process',
                position: { x: 0, y: 0 },
                data: { label: targetId }
            });
            createdNodeIds.add(targetId);
            labelToIdMap.set(targetId, targetId);
        }

        const finalEdge: Edge = {
            id: `edge-${i}`, // Unique ID for the edge
            source: sourceId,
            target: targetId,
            label: e.label,
            type: 'default', // Default edge type
            data: { label: e.label }
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
        errors
    };
};
