// One Tabler icon's node list → SVG text. Pure, so the MCP server draws the
// same glyph the editor does from the same package data.

export type TablerNode = readonly [string, Readonly<Record<string, string>>];

const INK = '#334155';

function attributeText(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
}

/** SVG for one icon at 96px, so the rasterised texture stays sharp on a 60px plate. */
export function tablerSvg(nodes: readonly TablerNode[]): string {
  const body = nodes.map(([tag, attributes]) => `<${tag} ${attributeText(attributes)}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
