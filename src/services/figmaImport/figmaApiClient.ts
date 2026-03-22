/** Figma REST API — browser-side, read-only personal access token. */

export interface FigmaColor {
    r: number; // 0–1
    g: number; // 0–1
    b: number; // 0–1
    a: number; // 0–1
}

export interface FigmaStyle {
    key: string;
    name: string;
    styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
    node_id: string;
}

export interface FigmaFill {
    type: string;
    color?: FigmaColor;
}

export interface FigmaTypographyStyle {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
}

export interface FigmaExtractedStyle {
    name: string;
    type: 'color' | 'text';
    hex?: string;
    fontFamily?: string;
    fontSize?: number;
}

/** Parse a Figma file URL and return the file key. */
export function parseFigmaFileKey(url: string): string | null {
    // https://www.figma.com/file/FILEKEY/...
    // https://www.figma.com/design/FILEKEY/...
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    return match?.[1] ?? null;
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface FigmaImportResult {
    name: string;
    colors: FigmaExtractedStyle[];
    fonts: FigmaExtractedStyle[];
}

export async function fetchFigmaStyles(fileKey: string, token: string): Promise<FigmaImportResult> {
    const headers = { 'X-Figma-Token': token };

    // Step 1: get file metadata + styles list
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, { headers });
    if (!fileRes.ok) {
        if (fileRes.status === 403) throw new Error('Invalid Figma token or no access to this file.');
        if (fileRes.status === 404) throw new Error('Figma file not found. Check the URL.');
        throw new Error(`Figma API error: ${fileRes.status}`);
    }
    const fileData = (await fileRes.json()) as { name: string; styles: Record<string, FigmaStyle> };
    const fileName = fileData.name;

    const styleEntries = Object.values(fileData.styles ?? {});
    const colorStyles = styleEntries.filter((s) => s.styleType === 'FILL');
    const textStyles = styleEntries.filter((s) => s.styleType === 'TEXT');

    const allNodeIds = [...colorStyles, ...textStyles].map((s) => s.node_id);
    if (allNodeIds.length === 0) {
        return { name: fileName, colors: [], fonts: [] };
    }

    // Step 2: fetch the actual node data to get fill/type values
    const nodeIds = allNodeIds.slice(0, 50).join(','); // cap to avoid huge requests
    const nodesRes = await fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeIds)}`, { headers });
    if (!nodesRes.ok) throw new Error(`Figma API error fetching nodes: ${nodesRes.status}`);

    const nodesData = (await nodesRes.json()) as {
        nodes: Record<string, { document: { fills?: FigmaFill[]; style?: FigmaTypographyStyle } }>;
    };

    const styleById = new Map(styleEntries.map((s) => [s.node_id, s]));

    const colors: FigmaExtractedStyle[] = [];
    const fonts: FigmaExtractedStyle[] = [];

    for (const [nodeId, nodeWrapper] of Object.entries(nodesData.nodes ?? {})) {
        const style = styleById.get(nodeId);
        if (!style || !nodeWrapper?.document) continue;

        if (style.styleType === 'FILL') {
            const fill = nodeWrapper.document.fills?.[0];
            if (fill?.type === 'SOLID' && fill.color) {
                colors.push({
                    name: style.name,
                    type: 'color',
                    hex: rgbToHex(fill.color.r, fill.color.g, fill.color.b),
                });
            }
        } else if (style.styleType === 'TEXT') {
            const typStyle = nodeWrapper.document.style;
            if (typStyle?.fontFamily) {
                fonts.push({
                    name: style.name,
                    type: 'text',
                    fontFamily: typStyle.fontFamily,
                    fontSize: typStyle.fontSize,
                });
            }
        }
    }

    return { name: fileName, colors, fonts };
}
