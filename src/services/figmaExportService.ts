import { Edge, Node } from 'reactflow';
import { renderEdgesLayer } from './figma/edgeHelpers';
import { getIconMap } from './figma/iconHelpers';
import {
    renderAnnotationsLayer,
    renderSectionsLayer,
    renderStandardNodesLayer,
    renderTextNodesLayer,
} from './figma/nodeLayers';

function getCanvasBounds(nodes: Node[]): { minX: number; minY: number; width: number; height: number } {
    const padding = 60;
    const minX = Math.min(...nodes.map((node) => node.position.x)) - padding;
    const minY = Math.min(...nodes.map((node) => node.position.y)) - padding;
    const maxX = Math.max(...nodes.map((node) => node.position.x + (node.width || 200))) + padding;
    const maxY = Math.max(...nodes.map((node) => node.position.y + (node.height || 100))) + padding;

    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

export const toFigmaSVG = async (nodes: Node[], edges: Edge[]): Promise<string> => {
    if (nodes.length === 0) {
        return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }

    const { minX, minY, width, height } = getCanvasBounds(nodes);
    const out: string[] = [];
    const iconMap = await getIconMap();

    out.push(`<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`);
    out.push(`<defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.10)" />
    </filter>
  </defs>`);

    renderEdgesLayer(out, nodes, edges);
    renderSectionsLayer(out, nodes, iconMap);
    renderAnnotationsLayer(out, nodes);
    renderStandardNodesLayer(out, nodes, iconMap);
    renderTextNodesLayer(out, nodes);

    out.push('</svg>');
    return out.join('\n');
};
