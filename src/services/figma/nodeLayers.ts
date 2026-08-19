import type { ElementType } from 'react';
import type { FlowNode, NodeData } from '@/lib/types';
import { NODE_DEFAULTS } from '@/theme';
import { getIconSVGContent } from './iconHelpers';
import { escapeXml, getNodeTheme, getSectionTheme } from './themeHelpers';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import {
    layoutNodeContent,
    resolveNodeContentLayout,
} from '@/opencanvas/domain/node-layout/model';
import type { LabelAlignment } from '@/opencanvas/domain/node-layout/types';

type IconMap = Record<string, ElementType>;

function svgTextAnchor(alignment: LabelAlignment): 'start' | 'middle' | 'end' {
    if (alignment === 'start') return 'start';
    if (alignment === 'end') return 'end';
    return 'middle';
}

function alignedTextX(x: number, width: number, alignment: LabelAlignment): number {
    if (alignment === 'start') return x;
    if (alignment === 'end') return x + width;
    return x + width / 2;
}

function estimatedTextWidth(lines: readonly string[], pixelsPerCharacter: number): number {
    return Math.max(...lines.map((line) => line.length), 1) * pixelsPerCharacter;
}

export function renderSectionsLayer(out: string[], nodes: FlowNode[], iconMap: IconMap): void {
    out.push('<g id="sections">');

    nodes
        .filter((node) => node.type === 'section')
        .forEach((node) => {
            const x = node.position.x;
            const y = node.position.y;
            const width = node.width || (node.style?.width as number) || 500;
            const height = node.height || (node.style?.height as number) || 300;
            const data = node.data ?? ({} as NodeData);
            const color = data.color || 'blue';
            const theme = getSectionTheme(color);

            out.push(`  <g id="section-${node.id}">`);
            out.push(`    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" stroke-dasharray="8 4" />`);

            const titleBarHeight = 40;
            out.push(`    <line x1="${x}" y1="${y + titleBarHeight}" x2="${x + width}" y2="${y + titleBarHeight}" stroke="${theme.border}" stroke-width="1" stroke-dasharray="6 4" />`);

            const groupIcon = getIconSVGContent('Group', theme.title, iconMap);
            if (groupIcon) {
                out.push(`    <g transform="translate(${x + 16}, ${y + 12})">`);
                out.push(`      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${theme.title}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${groupIcon}</svg>`);
                out.push('    </g>');
            }

            const label = data.label || 'Section';
            out.push(`    <text x="${x + 40}" y="${y + 28}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="${theme.title}" letter-spacing="-0.01em">${escapeXml(label)}</text>`);

            if (data.subLabel) {
                const badgeText = escapeXml(data.subLabel);
                const badgeWidth = badgeText.length * 6 + 16;
                const badgeX = x + 40 + label.length * 8 + 12;
                out.push(`    <rect x="${badgeX}" y="${y + 12}" width="${badgeWidth}" height="20" rx="10" fill="${theme.badgeBg}" />`);
                out.push(`    <text x="${badgeX + badgeWidth / 2}" y="${y + 24}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="${theme.badgeText}" text-anchor="middle">${badgeText}</text>`);
            }

            out.push('  </g>');
        });

    out.push('</g>');
}

export function renderAnnotationsLayer(out: string[], nodes: FlowNode[]): void {
    out.push('<g id="annotations">');

    nodes
        .filter((node) => node.type === 'annotation')
        .forEach((node) => {
            const x = node.position.x;
            const y = node.position.y;
            const width = node.width || 200;
            const height = node.height || 120;
            const data = node.data ?? ({} as NodeData);

            out.push(`  <g id="annotation-${node.id}" filter="url(#shadow)">`);

            const radiusTL = 4;
            const radiusTR = 4;
            const radiusBR = 24;
            const radiusBL = 4;
            out.push(`    <path d="
      M${x + radiusTL},${y}
      L${x + width - radiusTR},${y} Q${x + width},${y} ${x + width},${y + radiusTR}
      L${x + width},${y + height - radiusBR} Q${x + width},${y + height} ${x + width - radiusBR},${y + height}
      L${x + radiusBL},${y + height} Q${x},${y + height} ${x},${y + height - radiusBL}
      L${x},${y + radiusTL} Q${x},${y} ${x + radiusTL},${y}
      Z" fill="#fef3c7" fill-opacity="0.9" stroke="#fcd34d" stroke-width="1" />`);

            if (data.label) {
                out.push(`    <text x="${x + 16}" y="${y + 24}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="12" fill="#78350f">${escapeXml(data.label)}</text>`);
                out.push(`    <line x1="${x + 16}" y1="${y + 32}" x2="${x + width - 16}" y2="${y + 32}" stroke="#fde68a" stroke-width="1" />`);
            }

            if (data.subLabel) {
                out.push(`    <text x="${x + 16}" y="${y + 48}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="#92400e">${escapeXml(data.subLabel)}</text>`);
            }

            const foldSize = 24;
            out.push(`    <path d="M${x + width - foldSize},${y + height} Q${x + width - foldSize},${y + height - foldSize} ${x + width},${y + height - foldSize}" fill="none" stroke="#fde68a" stroke-width="1" opacity="0.6" />`);
            out.push(`    <rect x="${x + width - foldSize}" y="${y + height - foldSize}" width="${foldSize}" height="${foldSize}" rx="12" fill="#fef08a" fill-opacity="0.5" />`);
            out.push('  </g>');
        });

    out.push('</g>');
}

export function renderStandardNodesLayer(out: string[], nodes: FlowNode[], iconMap: IconMap): void {
    out.push('<g id="nodes">');

    nodes
        .filter((node) => node.type !== 'section' && node.type !== 'annotation' && node.type !== 'text')
        .forEach((node) => {
            const x = node.position.x;
            const y = node.position.y;
            const width = node.width || 200;
            const height = node.height || 100;
            const data = node.data ?? ({} as NodeData);
            const nodeType = node.type || 'process';
            const defaults = NODE_DEFAULTS[nodeType] || NODE_DEFAULTS.process;
            const activeColor = data.color || defaults.color;
            const activeIcon = data.icon === 'none' ? null : (data.icon || defaults.icon);
            const activeShape = data.shape || defaults.shape;
            const theme = getNodeTheme(activeColor);
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            out.push(`  <g id="node-${node.id}" filter="url(#shadow)">`);

            let shapePath = '';
            let shapeExtra = '';

            switch (activeShape) {
                case 'diamond':
                    shapePath = `M${centerX},${y} L${x + width},${centerY} L${centerX},${y + height} L${x},${centerY} Z`;
                    break;
                case 'hexagon': {
                    const halfWidth = width / 4;
                    shapePath = `M${x + halfWidth},${y} L${x + width - halfWidth},${y} L${x + width},${centerY} L${x + width - halfWidth},${y + height} L${x + halfWidth},${y + height} L${x},${centerY} Z`;
                    break;
                }
                case 'parallelogram': {
                    const skew = 20;
                    shapePath = `M${x + skew},${y} L${x + width},${y} L${x + width - skew},${y + height} L${x},${y + height} Z`;
                    break;
                }
                case 'ellipse':
                    shapePath = `M${x},${centerY} A${width / 2},${height / 2} 0 1,1 ${x + width},${centerY} A${width / 2},${height / 2} 0 1,1 ${x},${centerY}`;
                    break;
                case 'circle': {
                    const radius = Math.min(width, height) / 2;
                    shapePath = `M${centerX - radius},${centerY} A${radius},${radius} 0 1,1 ${centerX + radius},${centerY} A${radius},${radius} 0 1,1 ${centerX - radius},${centerY}`;
                    break;
                }
                case 'cylinder': {
                    const radiusY = 10;
                    shapePath = `M${x},${y + radiusY} L${x},${y + height - radiusY} Q${x},${y + height} ${centerX},${y + height} Q${x + width},${y + height} ${x + width},${y + height - radiusY} L${x + width},${y + radiusY} Q${x + width},${y} ${centerX},${y} Q${x},${y} ${x},${y + radiusY} Z`;
                    shapeExtra = `<ellipse cx="${centerX}" cy="${y + radiusY}" rx="${width / 2}" ry="${radiusY}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" opacity="0.5" />`;
                    break;
                }
                case 'capsule': {
                    const radius = Math.min(width, height) / 2;
                    if (width >= height) {
                        shapePath = `M${x + radius},${y} L${x + width - radius},${y} A${radius},${height / 2} 0 0,1 ${x + width - radius},${y + height} L${x + radius},${y + height} A${radius},${height / 2} 0 0,1 ${x + radius},${y} Z`;
                    } else {
                        shapePath = `M${x},${y + radius} L${x},${y + height - radius} A${width / 2},${radius} 0 0,0 ${x + width},${y + height - radius} L${x + width},${y + radius} A${width / 2},${radius} 0 0,0 ${x},${y + radius} Z`;
                    }
                    break;
                }
                case 'rounded':
                default: {
                    const radius = activeShape === 'rectangle' ? 2 : 12;
                    shapePath = `M${x + radius},${y} L${x + width - radius},${y} Q${x + width},${y} ${x + width},${y + radius} L${x + width},${y + height - radius} Q${x + width},${y + height} ${x + width - radius},${y + height} L${x + radius},${y + height} Q${x},${y + height} ${x},${y + height - radius} L${x},${y + radius} Q${x},${y} ${x + radius},${y} Z`;
                    break;
                }
            }

            out.push(`    <path d="${shapePath}" fill="${theme.bg}" stroke="${theme.border}" stroke-width="2" />`);
            if (shapeExtra) {
                out.push(`    ${shapeExtra}`);
            }

            let contentX = x;
            let contentWidth = width;
            if (activeShape === 'diamond') {
                contentX = x + width * 0.2;
                contentWidth = width * 0.6;
            }
            if (activeShape === 'parallelogram') {
                contentX = x + 20;
                contentWidth = width - 40;
            }

            const iconSize = 40;
            const labelLineHeight = 16;
            const subLabelLineHeight = 14;
            const labelLines = String(data.label || 'Node').split('\n');
            const subLabelLines = data.subLabel ? String(data.subLabel).split('\n') : [];
            const contentGeometry = layoutNodeContent(
                resolveNodeContentLayout(data, ROLLOUT_FLAGS.openCanvasNodeLayoutV1),
                {
                    nodeSize: { width: contentWidth, height },
                    iconSize: activeIcon ? { width: iconSize, height: iconSize } : null,
                    labelSize: {
                        width: estimatedTextWidth(labelLines, 7.5),
                        height: labelLines.length * labelLineHeight,
                    },
                    subLabelSize: data.subLabel
                        ? {
                            width: estimatedTextWidth(subLabelLines, 6.5),
                            height: subLabelLines.length * subLabelLineHeight,
                        }
                        : null,
                }
            );
            const textAnchor = svgTextAnchor(contentGeometry.labelAlignment);

            if (activeIcon && contentGeometry.iconBounds) {
                const iconBoxX = contentX + contentGeometry.iconBounds.x;
                const iconBoxY = y + contentGeometry.iconBounds.y;
                const renderedIconSize = Math.min(contentGeometry.iconBounds.width, contentGeometry.iconBounds.height);
                out.push(`    <rect x="${iconBoxX}" y="${iconBoxY}" width="${contentGeometry.iconBounds.width}" height="${contentGeometry.iconBounds.height}" rx="8" fill="${theme.iconBg}" stroke="rgba(0,0,0,0.05)" stroke-width="1" />`);

                const iconContent = getIconSVGContent(activeIcon, theme.iconColor, iconMap);
                if (iconContent) {
                    const glyphSize = renderedIconSize / 2;
                    out.push(`    <g transform="translate(${iconBoxX + (contentGeometry.iconBounds.width - glyphSize) / 2}, ${iconBoxY + (contentGeometry.iconBounds.height - glyphSize) / 2})">`);
                    out.push(`      <svg width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24" fill="none" stroke="${theme.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`);
                    out.push('    </g>');
                }
            }

            const labelX = contentX + alignedTextX(
                contentGeometry.labelBounds.x,
                contentGeometry.labelBounds.width,
                contentGeometry.labelAlignment
            );
            const labelY = y + contentGeometry.labelBounds.y;
            out.push(`    <text x="${labelX}" y="${labelY + labelLineHeight - 2}" font-family="Inter, system-ui, sans-serif" font-weight="700" font-size="14" fill="${theme.text}" text-anchor="${textAnchor}">`);
            labelLines.forEach((line, index) => {
                out.push(`      <tspan x="${labelX}" dy="${index === 0 ? 0 : '1.2em'}">${escapeXml(line)}</tspan>`);
            });
            out.push('    </text>');

            if (data.subLabel && contentGeometry.subLabelBounds) {
                const subLabelX = contentX + alignedTextX(
                    contentGeometry.subLabelBounds.x,
                    contentGeometry.subLabelBounds.width,
                    contentGeometry.labelAlignment
                );
                const subLabelY = y + contentGeometry.subLabelBounds.y;
                out.push(`    <text x="${subLabelX}" y="${subLabelY + subLabelLineHeight - 2}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="${theme.subText}" text-anchor="${textAnchor}">`);
                subLabelLines.forEach((line, index) => {
                    out.push(`      <tspan x="${subLabelX}" dy="${index === 0 ? 0 : '1.2em'}">${escapeXml(line)}</tspan>`);
                });
                out.push('    </text>');
            }

            out.push('  </g>');
        });

    out.push('</g>');
}

export function renderTextNodesLayer(out: string[], nodes: FlowNode[]): void {
    out.push('<g id="text-nodes">');

    nodes
        .filter((node) => node.type === 'text')
        .forEach((node) => {
            const x = node.position.x;
            const y = node.position.y;
            const width = node.width || 50;
            const height = node.height || 30;
            const data = node.data ?? ({} as NodeData);
            const color = data.color || 'slate';
            const theme = getNodeTheme(color);
            const label = escapeXml(data.label || 'Text');
            const fontSizeMap: Record<string, number> = { small: 12, medium: 14, large: 18, xl: 24 };
            const fontSize = fontSizeMap[data.fontSize || 'medium'] || 14;
            const fontFamilyMap: Record<string, string> = {
                sans: 'Inter, system-ui, sans-serif',
                serif: 'Times New Roman, serif',
                mono: 'Courier New, monospace',
            };
            const fontFamily = fontFamilyMap[data.fontFamily || 'sans'] || 'Inter, system-ui, sans-serif';
            const lines = label.split('\n');
            const lineHeight = fontSize * 1.2;
            const totalTextHeight = lines.length * lineHeight;
            const startY = y + (height - totalTextHeight) / 2 + fontSize - 2;

            out.push(`  <g id="text-${node.id}">`);

            if (data.backgroundColor) {
                out.push(`    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${data.backgroundColor}" rx="8" />`);
            }

            out.push(`    <text x="${x + width / 2}" y="${startY}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="500" fill="${theme.text}" text-anchor="middle">`);
            lines.forEach((line, index) => {
                out.push(`      <tspan x="${x + width / 2}" dy="${index === 0 ? 0 : '1.2em'}">${line}</tspan>`);
            });
            out.push('    </text>');
            out.push('  </g>');
        });

    out.push('</g>');
}
