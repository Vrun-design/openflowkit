/**
 * Extracts diagram-level configuration from Mermaid input.
 *
 * Supports two surface syntaxes that ship with Mermaid:
 *
 *   1. YAML frontmatter (preferred in v10+):
 *        ---
 *        config:
 *          flowchart:
 *            curve: basis
 *        ---
 *        flowchart TD
 *          A --> B
 *
 *   2. Init directive (legacy but still common):
 *        %%{init: {'flowchart': {'curve': 'basis'}}}%%
 *
 * Both forms are parsed with regex + a permissive JSON-ish reader rather than a
 * full YAML/JSON parser — the surface area we care about (curve + layout knobs)
 * is small, and we want zero new heavy deps.
 */

import { coerceEdgeCurve, type EdgeCurve } from '@/lib/edgeCurve';

export interface MermaidDirectiveConfig {
    flowchartCurve?: EdgeCurve;
    /** Any future scalar settings we want to plumb (layout engine, look, etc.). */
}

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;
const INIT_DIRECTIVE_REGEX = /%%\s*\{\s*init\s*:\s*(\{[\s\S]*?\})\s*\}\s*%%/i;

function findIndentedKey(yaml: string, key: string): string | null {
    const lines = yaml.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
        const trimmed = lines[i].trim();
        const match = trimmed.match(new RegExp(`^${key}\\s*:\\s*(.*)$`));
        if (!match) continue;
        const value = match[1].trim();
        if (value.length > 0) return value.replace(/^['"]|['"]$/g, '');
        return null; // key present but value on subsequent lines (object) — caller handles nesting
    }
    return null;
}

function extractFromFrontmatter(input: string): EdgeCurve | undefined {
    const match = input.match(FRONTMATTER_REGEX);
    if (!match) return undefined;
    const body = match[1];

    // Look for either `config.flowchart.curve` (v10+) or `flowchart.curve` (compat).
    // We do a small scoped scan: find the `flowchart:` block and read `curve:` under it.
    const flowchartBlockRegex = /(^|\n)\s*flowchart\s*:\s*\n([\s\S]*?)(?=\n\S|$)/;
    const block = body.match(flowchartBlockRegex);
    if (block) {
        const curveLine = block[2].match(/\bcurve\s*:\s*['"]?([A-Za-z]+)['"]?/);
        if (curveLine) return coerceEdgeCurve(curveLine[1], 'basis');
    }
    // Fallback: scalar `curve: basis` at top level (uncommon but harmless).
    const scalarCurve = findIndentedKey(body, 'curve');
    if (scalarCurve) return coerceEdgeCurve(scalarCurve, 'basis');
    return undefined;
}

function safeJsonish(raw: string): Record<string, unknown> | null {
    // Mermaid's init directives often use single quotes / unquoted keys. Convert
    // to strict JSON before parsing.
    try {
        const normalized = raw
            .replace(/'/g, '"')
            .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
        return JSON.parse(normalized) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function extractFromInitDirective(input: string): EdgeCurve | undefined {
    const match = input.match(INIT_DIRECTIVE_REGEX);
    if (!match) return undefined;
    const parsed = safeJsonish(match[1]);
    if (!parsed) return undefined;
    const flowchart = parsed.flowchart as { curve?: unknown } | undefined;
    if (flowchart && typeof flowchart.curve === 'string') {
        return coerceEdgeCurve(flowchart.curve, 'basis');
    }
    return undefined;
}

export function parseMermaidDirectives(input: string): MermaidDirectiveConfig {
    const flowchartCurve = extractFromFrontmatter(input) ?? extractFromInitDirective(input);
    return flowchartCurve ? { flowchartCurve } : {};
}
