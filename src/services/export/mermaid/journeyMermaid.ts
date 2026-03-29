import type { FlowNode } from '@/lib/types';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

export function toJourneyMermaid(nodes: FlowNode[]): string {
  const lines: string[] = ['journey', '    title Journey'];
  const sectionMap = new Map<string, FlowNode[]>();

  sortNodesByPosition(nodes).forEach((node) => {
    const section = String(node.data.journeySection || 'General').trim() || 'General';
    const sectionNodes = sectionMap.get(section) ?? [];
    sectionNodes.push(node);
    sectionMap.set(section, sectionNodes);
  });

  sectionMap.forEach((sectionNodes) => {
    sectionNodes.sort((left, right) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    });
  });

  const orderedSections = Array.from(sectionMap.keys()).sort((left, right) => {
    const leftMinX = Math.min(...(sectionMap.get(left) ?? []).map((node) => node.position.x));
    const rightMinX = Math.min(...(sectionMap.get(right) ?? []).map((node) => node.position.x));
    if (leftMinX !== rightMinX) return leftMinX - rightMinX;
    return left.localeCompare(right);
  });

  orderedSections.forEach((section) => {
    lines.push(`    section ${section}`);
    const sectionNodes = sectionMap.get(section) ?? [];
    sectionNodes.forEach((node) => {
      const task = String(node.data.journeyTask || node.data.label || node.id).trim() || node.id;
      const actor = String(node.data.journeyActor || node.data.subLabel || '').trim();
      const scoreValue = node.data.journeyScore;
      const hasScore =
        typeof scoreValue === 'number' &&
        Number.isFinite(scoreValue) &&
        scoreValue >= 0 &&
        scoreValue <= 5;
      if (hasScore && actor) {
        lines.push(`      ${task}: ${Math.round(scoreValue)}: ${actor}`);
        return;
      }
      if (hasScore) {
        lines.push(`      ${task}: ${Math.round(scoreValue)}`);
        return;
      }
      lines.push(`      ${task}`);
    });
  });

  return `${lines.join('\n')}\n`;
}
