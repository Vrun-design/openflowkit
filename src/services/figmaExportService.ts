import { Node, Edge, Position, getSmoothStepPath } from 'reactflow';
import ReactDOMServer from 'react-dom/server';
import React from 'react';
import * as AllIcons from 'lucide-react';
import {
    NODE_EXPORT_COLORS,
    SECTION_COLOR_PALETTE,
    NODE_DEFAULTS,
} from '../theme';

// ============================================================================
// 1. ICON HELPERS
// ============================================================================

const ICON_MAP = Object.entries(AllIcons).reduce((acc, [key, component]) => {
    if (key !== 'createLucideIcon' && key !== 'default' && /^[A-Z]/.test(key)) {
        acc[key] = component as React.ElementType;
    }
    return acc;
}, {} as Record<string, React.ElementType>);

/** Render a Lucide icon to inline SVG paths (strips outer <svg> wrapper for clean embedding) */
const getIconSVGContent = (iconName: string, color: string): string => {
    if (!iconName || iconName === 'none') return '';

    let IconComponent = ICON_MAP[iconName];
    if (!IconComponent) {
        const keyLower = iconName.toLowerCase();
        const foundKey = Object.keys(ICON_MAP).find(k => k.toLowerCase() === keyLower);
        if (foundKey) IconComponent = ICON_MAP[foundKey];
    }
    if (!IconComponent) IconComponent = AllIcons.Settings as unknown as React.ElementType;

    try {
        const svgString = ReactDOMServer.renderToStaticMarkup(
            React.createElement(IconComponent, { size: 20, color, strokeWidth: 2 })
        );
        // Strip the outer <svg ...> and </svg> tags so we get just the inner <path>, <circle>, etc.
        // This makes Figma treat them as native vector shapes inside our <g>.
        const innerContent = svgString
            .replace(/<svg[^>]*>/, '')
            .replace(/<\/svg>/, '');
        return innerContent;
    } catch (e) {
        return '';
    }
};

// ============================================================================
const getNodeTheme = (color: string = 'slate') => NODE_EXPORT_COLORS[color] || NODE_EXPORT_COLORS.slate;
const getSectionTheme = (color: string = 'blue') => {
    const t = SECTION_COLOR_PALETTE[color] || SECTION_COLOR_PALETTE.blue;
    return {
        bg: t.bg,
        border: t.border,
        title: t.title,
        badgeBg: t.badgeBgHex || '#e2e8f0',
        badgeText: t.badgeTextHex || '#334155',
    };
};

// ============================================================================
// 3. EDGE HELPERS
// ============================================================================

/** Escape XML special chars in edge labels */
const escapeXml = (str: string): string =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Draw a small chevron arrow head manually (Figma ignores SVG markers) */
const renderArrowHead = (tx: number, ty: number, targetPos: Position): string => {
    const s = 6;
    let d = '';
    switch (targetPos) {
        case Position.Top: d = `M${tx - s},${ty - s} L${tx},${ty} L${tx + s},${ty - s}`; break;
        case Position.Bottom: d = `M${tx - s},${ty + s} L${tx},${ty} L${tx + s},${ty + s}`; break;
        case Position.Left: d = `M${tx - s},${ty - s} L${tx},${ty} L${tx - s},${ty + s}`; break;
        case Position.Right: d = `M${tx + s},${ty - s} L${tx},${ty} L${tx + s},${ty + s}`; break;
    }
    return `<path d="${d}" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
};

/** Determine source/target handle positions and coordinates based on edge data + relative positions */
const resolveHandlePositions = (
    sourceNode: Node, targetNode: Node,
    edge: Edge
): { sx: number; sy: number; tx: number; ty: number; sourcePos: Position; targetPos: Position } => {
    const sW = sourceNode.width || 200;
    const sH = sourceNode.height || 100;
    const tW = targetNode.width || 200;
    const tH = targetNode.height || 100;

    // If the edge has explicit handle IDs, use them
    const srcHandle = edge.sourceHandle;
    const tgtHandle = edge.targetHandle;

    let sourcePos: Position;
    let targetPos: Position;
    let sx: number, sy: number, tx: number, ty: number;

    // Try to use explicit handles first
    if (srcHandle && tgtHandle) {
        const handleMap: Record<string, { pos: Position; x: (n: Node, w: number, h: number) => number; y: (n: Node, w: number, h: number) => number }> = {
            top: { pos: Position.Top, x: (n, w) => n.position.x + w / 2, y: (n) => n.position.y },
            bottom: { pos: Position.Bottom, x: (n, w) => n.position.x + w / 2, y: (n, _, h) => n.position.y + h },
            left: { pos: Position.Left, x: (n) => n.position.x, y: (n, _, h) => n.position.y + h / 2 },
            right: { pos: Position.Right, x: (n, w) => n.position.x + w, y: (n, _, h) => n.position.y + h / 2 },
        };
        const src = handleMap[srcHandle] || handleMap.bottom;
        const tgt = handleMap[tgtHandle] || handleMap.top;

        sourcePos = src.pos;
        targetPos = tgt.pos;
        sx = src.x(sourceNode, sW, sH);
        sy = src.y(sourceNode, sW, sH);
        tx = tgt.x(targetNode, tW, tH);
        ty = tgt.y(targetNode, tW, tH);
    } else {
        // Heuristic based on relative positions
        const sCenterX = sourceNode.position.x + sW / 2;
        const sCenterY = sourceNode.position.y + sH / 2;
        const tCenterX = targetNode.position.x + tW / 2;
        const tCenterY = targetNode.position.y + tH / 2;

        const dx = tCenterX - sCenterX;
        const dy = tCenterY - sCenterY;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            if (dx > 0) {
                sourcePos = Position.Right; targetPos = Position.Left;
                sx = sourceNode.position.x + sW; sy = sourceNode.position.y + sH / 2;
                tx = targetNode.position.x; ty = targetNode.position.y + tH / 2;
            } else {
                sourcePos = Position.Left; targetPos = Position.Right;
                sx = sourceNode.position.x; sy = sourceNode.position.y + sH / 2;
                tx = targetNode.position.x + tW; ty = targetNode.position.y + tH / 2;
            }
        } else {
            // Vertical
            if (dy > 0) {
                sourcePos = Position.Bottom; targetPos = Position.Top;
                sx = sourceNode.position.x + sW / 2; sy = sourceNode.position.y + sH;
                tx = targetNode.position.x + tW / 2; ty = targetNode.position.y;
            } else {
                sourcePos = Position.Top; targetPos = Position.Bottom;
                sx = sourceNode.position.x + sW / 2; sy = sourceNode.position.y;
                tx = targetNode.position.x + tW / 2; ty = targetNode.position.y + tH;
            }
        }
    }

    return { sx, sy, tx, ty, sourcePos, targetPos };
};

// ============================================================================
// 4. MAIN EXPORT FUNCTION
// ============================================================================

export const toFigmaSVG = (nodes: Node[], edges: Edge[]): string => {
    if (nodes.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

    const PAD = 60;
    const minX = Math.min(...nodes.map(n => n.position.x)) - PAD;
    const minY = Math.min(...nodes.map(n => n.position.y)) - PAD;
    const maxX = Math.max(...nodes.map(n => n.position.x + (n.width || 200))) + PAD;
    const maxY = Math.max(...nodes.map(n => n.position.y + (n.height || 100))) + PAD;
    const W = maxX - minX;
    const H = maxY - minY;

    const out: string[] = [];

    // ── SVG Header ──
    out.push(`<svg width="${W}" height="${H}" viewBox="${minX} ${minY} ${W} ${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);

    // ── Defs: Drop shadow filter ──
    out.push(`<defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.10)" />
    </filter>
  </defs>`);

    // ── LAYER 1: Edges (behind everything) ──
    out.push(`<g id="edges">`);
    edges.forEach((edge) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const { sx, sy, tx, ty, sourcePos, targetPos } = resolveHandlePositions(sourceNode, targetNode, edge);

        const [pathData, labelX, labelY] = getSmoothStepPath({
            sourceX: sx, sourceY: sy, sourcePosition: sourcePos,
            targetX: tx, targetY: ty, targetPosition: targetPos,
            borderRadius: 16,
        });

        // Edge line
        out.push(`  <path d="${pathData}" stroke="#94a3b8" stroke-width="2" fill="none" />`);

        // Arrow head
        out.push(`  ${renderArrowHead(tx, ty, targetPos)}`);

        // Edge label
        if (edge.label) {
            const labelStr = escapeXml(String(edge.label));
            const labelW = Math.max(labelStr.length * 7 + 16, 40);
            out.push(`  <rect x="${labelX - labelW / 2}" y="${labelY - 10}" width="${labelW}" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />`);
            out.push(`  <text x="${labelX}" y="${labelY + 4}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="#334155" text-anchor="middle">${labelStr}</text>`);
        }
    });
    out.push(`</g>`);

    // ── LAYER 2: Section nodes (behind regular nodes) ──
    out.push(`<g id="sections">`);
    nodes.filter(n => n.type === 'section').forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width || (node.style?.width as number) || 500;
        const h = node.height || (node.style?.height as number) || 300;
        const data = node.data || {};
        const color = data.color || 'blue';
        const theme = getSectionTheme(color);

        out.push(`  <g id="section-${node.id}">`);

        // Background with dashed border (matching SectionNode.tsx: rounded-2xl border-2 border-dashed)
        out.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" stroke-dasharray="8 4" />`);

        // Title bar area (dashed bottom border)
        const titleBarH = 40;
        out.push(`    <line x1="${x}" y1="${y + titleBarH}" x2="${x + w}" y2="${y + titleBarH}" stroke="${theme.border}" stroke-width="1" stroke-dasharray="6 4" />`);

        // Group icon (16x16)
        const groupIcon = getIconSVGContent('Group', theme.title);
        if (groupIcon) {
            out.push(`    <g transform="translate(${x + 16}, ${y + 12})">`);
            out.push(`      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${theme.title}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${groupIcon}</svg>`);
            out.push(`    </g>`);
        }

        // Title text
        out.push(`    <text x="${x + 40}" y="${y + 28}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="${theme.title}" letter-spacing="-0.01em">${escapeXml(data.label || 'Section')}</text>`);

        // Badge (subLabel)
        if (data.subLabel) {
            const badgeStr = escapeXml(data.subLabel);
            const badgeW = badgeStr.length * 6 + 16;
            const badgeX = x + 40 + (data.label || 'Section').length * 8 + 12;
            out.push(`    <rect x="${badgeX}" y="${y + 12}" width="${badgeW}" height="20" rx="10" fill="${theme.badgeBg}" />`);
            out.push(`    <text x="${badgeX + badgeW / 2}" y="${y + 24}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="${theme.badgeText}" text-anchor="middle">${badgeStr}</text>`);
        }

        out.push(`  </g>`);
    });
    out.push(`</g>`);

    // ── LAYER 3: Annotation nodes (sticky notes) ──
    out.push(`<g id="annotations">`);
    nodes.filter(n => n.type === 'annotation').forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width || 200;
        const h = node.height || 120;
        const data = node.data || {};

        out.push(`  <g id="annotation-${node.id}" filter="url(#shadow)">`);

        // Main body: bg-yellow-100/90, border-yellow-300, rounded-br-3xl rounded-tl-sm
        // SVG doesn't support per-corner radii natively, so we'll use a path
        const rTL = 4, rTR = 4, rBR = 24, rBL = 4;
        out.push(`    <path d="
      M${x + rTL},${y}
      L${x + w - rTR},${y} Q${x + w},${y} ${x + w},${y + rTR}
      L${x + w},${y + h - rBR} Q${x + w},${y + h} ${x + w - rBR},${y + h}
      L${x + rBL},${y + h} Q${x},${y + h} ${x},${y + h - rBL}
      L${x},${y + rTL} Q${x},${y} ${x + rTL},${y}
      Z" fill="#fef3c7" fill-opacity="0.9" stroke="#fcd34d" stroke-width="1" />`);

        // Title with bottom separator
        if (data.label) {
            out.push(`    <text x="${x + 16}" y="${y + 24}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="#78350f">${escapeXml(data.label)}</text>`);
            out.push(`    <line x1="${x + 16}" y1="${y + 32}" x2="${x + w - 16}" y2="${y + 32}" stroke="#fde68a" stroke-width="1" />`);
        }

        // Body text
        if (data.subLabel) {
            out.push(`    <text x="${x + 16}" y="${y + 48}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="#92400e">${escapeXml(data.subLabel)}</text>`);
        }

        // Corner fold decoration
        const foldSize = 24;
        out.push(`    <path d="M${x + w - foldSize},${y + h} Q${x + w - foldSize},${y + h - foldSize} ${x + w},${y + h - foldSize}" fill="none" stroke="#fde68a" stroke-width="1" opacity="0.6" />`);
        out.push(`    <rect x="${x + w - foldSize}" y="${y + h - foldSize}" width="${foldSize}" height="${foldSize}" rx="12" fill="#fef08a" fill-opacity="0.5" />`);

        out.push(`  </g>`);
    });
    out.push(`</g>`);

    // ── LAYER 4: Standard nodes (start, process, decision, end, custom) ──
    out.push(`<g id="nodes">`);
    nodes.filter(n => n.type !== 'section' && n.type !== 'annotation' && n.type !== 'text').forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width || 200;
        const h = node.height || 100;
        const data = node.data || {};
        const nodeType = node.type || 'process';

        // Resolve defaults
        const defaults = NODE_DEFAULTS[nodeType] || NODE_DEFAULTS.process;
        const activeColor = data.color || defaults.color;
        const activeIcon = data.icon === 'none' ? null : (data.icon || defaults.icon);
        const activeShape = data.shape || defaults.shape;
        const theme = getNodeTheme(activeColor);

        out.push(`  <g id="node-${node.id}" filter="url(#shadow)">`);

        // Shape Geometry
        let shapePath = '';
        let shapeExtra = ''; // For cylinder cap or other multi-path shapes

        const cx = x + w / 2;
        const cy = y + h / 2;

        switch (activeShape) {
            case 'diamond':
                shapePath = `M${cx},${y} L${x + w},${cy} L${cx},${y + h} L${x},${cy} Z`;
                break;
            case 'hexagon': {
                const hw = w / 4;
                shapePath = `M${x + hw},${y} L${x + w - hw},${y} L${x + w},${cy} L${x + w - hw},${y + h} L${x + hw},${y + h} L${x},${cy} Z`;
                break;
            }
            case 'parallelogram': {
                const skew = 20;
                shapePath = `M${x + skew},${y} L${x + w},${y} L${x + w - skew},${y + h} L${x},${y + h} Z`;
                break;
            }
            case 'ellipse':
                shapePath = `M${x},${cy} A${w / 2},${h / 2} 0 1,1 ${x + w},${cy} A${w / 2},${h / 2} 0 1,1 ${x},${cy}`;
                break;
            case 'circle': {
                const r = Math.min(w, h) / 2;
                shapePath = `M${cx - r},${cy} A${r},${r} 0 1,1 ${cx + r},${cy} A${r},${r} 0 1,1 ${cx - r},${cy}`;
                break;
            }
            case 'cylinder': {
                const ry = 10;
                // Main body
                shapePath = `M${x},${y + ry} L${x},${y + h - ry} Q${x},${y + h} ${cx},${y + h} Q${x + w},${y + h} ${x + w},${y + h - ry} L${x + w},${y + ry} Q${x + w},${y} ${cx},${y} Q${x},${y} ${x},${y + ry} Z`;
                // Top cap overlap
                shapeExtra = `<ellipse cx="${cx}" cy="${y + ry}" rx="${w / 2}" ry="${ry}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" opacity="0.5" />`;
                break;
            }
            case 'capsule': {
                const rx_cap = Math.min(w, h) / 2;
                shapePath = `M${x + rx_cap},${y} L${x + w - rx_cap},${y} A${rx_cap},${rx_cap} 0 0,1 ${x + w},${y + h} L${x + rx_cap},${y + h} A${rx_cap},${rx_cap} 0 0,1 ${x},${y} Z`;
                if (w < h) { // vertical capsule
                    shapePath = `M${x},${y + rx_cap} L${x},${y + h - rx_cap} A${rx_cap},${rx_cap} 0 0,0 ${x + w},${y + h - rx_cap} L${x + w},${y + rx_cap} A${rx_cap},${rx_cap} 0 0,0 ${x},${y + rx_cap} Z`;
                }
                break;
            }
            case 'rounded':
            default: {
                const rx = activeShape === 'rectangle' ? 2 : 12;
                shapePath = `M${x + rx},${y} L${x + w - rx},${y} Q${x + w},${y} ${x + w},${y + rx} L${x + w},${y + h - rx} Q${x + w},${y + h} ${x + w - rx},${y + h} L${x + rx},${y + h} Q${x},${y + h} ${x},${y + h - rx} L${x},${y + rx} Q${x},${y} ${x + rx},${y} Z`;
                break;
            }
        }

        // Draw Shape
        out.push(`    <path d="${shapePath}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" />`);
        if (shapeExtra) out.push(`    ${shapeExtra}`);

        // Layout: Icon (40×40) on the left, text to the right
        const pad = 16;
        let contentX = x;
        let contentW = w;

        // Visual adjustment for Diamond/Parallelogram to keep text inside
        if (activeShape === 'diamond') { contentX = x + w * 0.2; contentW = w * 0.6; }
        if (activeShape === 'parallelogram') { contentX = x + 20; contentW = w - 40; }

        const centerX = contentX + contentW / 2;
        const centerY = cy;

        if (activeIcon) {
            const iconBoxSize = 40;
            const iconBoxX = centerX - (iconBoxSize + 12 + 60) / 2; // Approximate centering with text
            const iconBoxY = centerY - 20;

            // Icon background box
            out.push(`    <rect x="${iconBoxX}" y="${iconBoxY}" width="${iconBoxSize}" height="${iconBoxSize}" rx="8" fill="${theme.iconBg}" stroke="rgba(0,0,0,0.05)" stroke-width="1" />`);

            // Icon paths
            const iconContent = getIconSVGContent(activeIcon, theme.iconColor);
            if (iconContent) {
                out.push(`    <g transform="translate(${iconBoxX + 10}, ${iconBoxY + 10})">`);
                out.push(`      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${theme.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`);
                out.push(`    </g>`);
            }

            // Text next to icon
            const textX = iconBoxX + iconBoxSize + 12;
            const lLines = String(data.label || 'Node').split('\n');
            const sLines = String(data.subLabel || '').split('\n');

            if (data.subLabel) {
                // Label
                out.push(`    <text x="${textX}" y="${centerY - 8}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="${theme.text}">`);
                lLines.forEach((l, i) => out.push(`      <tspan x="${textX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);

                // SubLabel
                out.push(`    <text x="${textX}" y="${centerY + 8 + (lLines.length - 1) * 14}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="${theme.subText}">`);
                sLines.forEach((l, i) => out.push(`      <tspan x="${textX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);
            } else {
                out.push(`    <text x="${textX}" y="${centerY + 5}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="${theme.text}">`);
                lLines.forEach((l, i) => out.push(`      <tspan x="${textX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);
            }

        } else {
            // No icon — center text
            const lLines = String(data.label || 'Node').split('\n');
            const sLines = String(data.subLabel || '').split('\n');

            if (data.subLabel) {
                out.push(`    <text x="${centerX}" y="${centerY - 8}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="${theme.text}" text-anchor="middle">`);
                lLines.forEach((l, i) => out.push(`      <tspan x="${centerX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);

                out.push(`    <text x="${centerX}" y="${centerY + 8 + (lLines.length - 1) * 14}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="${theme.subText}" text-anchor="middle">`);
                sLines.forEach((l, i) => out.push(`      <tspan x="${centerX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);
            } else {
                out.push(`    <text x="${centerX}" y="${centerY + 5}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="${theme.text}" text-anchor="middle">`);
                lLines.forEach((l, i) => out.push(`      <tspan x="${centerX}" dy="${i === 0 ? 0 : '1.2em'}">${escapeXml(l)}</tspan>`));
                out.push(`    </text>`);
            }
        }

        out.push(`  </g>`);
    });
    out.push(`</g>`);

    // ── LAYER 5: Text nodes ──
    out.push(`<g id="text-nodes">`);
    nodes.filter(n => n.type === 'text').forEach(node => {
        const x = node.position.x;
        const y = node.position.y;
        const w = node.width || 50;
        const h = node.height || 30;
        const data = node.data || {};
        const color = data.color || 'slate';
        const theme = getNodeTheme(color); // Reuse node theme for text color

        // Background
        if (data.backgroundColor) {
            out.push(`    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${data.backgroundColor}" rx="8" />`);
        }

        const label = escapeXml(data.label || 'Text');

        // Font Styles
        const fontSizeMap: Record<string, number> = { small: 12, medium: 14, large: 18, xl: 24 };
        const fontSize = fontSizeMap[data.fontSize || 'medium'] || 14;

        const fontFamilyMap: Record<string, string> = {
            sans: 'Inter, system-ui, sans-serif',
            serif: 'Times New Roman, serif',
            mono: 'Courier New, monospace'
        };
        const fontFamily = fontFamilyMap[data.fontFamily || 'sans'] || 'Inter, system-ui, sans-serif';

        // Split by newlines for basic multiline support
        const lines = label.split('\n');
        const lineHeight = fontSize * 1.2;
        const totalTextH = lines.length * lineHeight;
        const startY = y + (h - totalTextH) / 2 + fontSize - 2; // Vertical center approx

        out.push(`    <text x="${x + w / 2}" y="${startY}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="500" fill="${theme.text}" text-anchor="middle">`);
        lines.forEach((line, i) => {
            out.push(`      <tspan x="${x + w / 2}" dy="${i === 0 ? 0 : '1.2em'}">${line}</tspan>`);
        });
        out.push(`    </text>`);

        out.push(`  </g>`);
    });
    out.push(`</g>`);

    out.push(`</svg>`);
    return out.join('\n');
};
