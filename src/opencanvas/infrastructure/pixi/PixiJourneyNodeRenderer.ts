import { Container, Graphics } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import { projectJourneyNodeVisual, type PixiJourneyNodeVisual } from './journeyNodeVisual';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, truncateTextToWidth } from './pixiText';

const HEADER_HEIGHT = 34;

export interface PixiJourneyNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

export class PixiJourneyNodeRenderer {
  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics
  ): PixiJourneyNodeDrawResult | null {
    const visual = projectJourneyNodeVisual(node);
    if (!visual) return null;
    this.drawChrome(node, matrix, graphics, visual);
    const label = this.createLabel(node, visual);
    applyPixiNodeMatrix(label, matrix);
    return {
      label,
      debug: {
        id: node.id,
        kind: 'journey',
        shape: 'journey-step',
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: 'none',
        journeySection: visual.presentation.section,
        journeyScore: visual.presentation.score ?? null,
      },
    };
  }

  private drawChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiJourneyNodeVisual
  ): void {
    drawPixiNodeOutline(graphics, 'rounded', node.size, matrix);
    graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.5 });
    drawPixiLocalRect(
      graphics,
      { x: 1, y: 1, width: node.size.width - 2, height: HEADER_HEIGHT - 1 },
      matrix,
      11
    );
    graphics.fill({ color: visual.headerFill });
    drawPixiLocalRect(
      graphics,
      { x: 0, y: HEADER_HEIGHT, width: node.size.width, height: 1 },
      matrix
    );
    graphics.fill({ color: visual.stroke });
    const score = visual.presentation.score ?? 0;
    for (let index = 0; index < 5; index += 1) {
      drawPixiLocalRect(
        graphics,
        { x: node.size.width - 72 + index * 12, y: 13, width: 7, height: 7 },
        matrix,
        3.5
      );
      graphics.fill({ color: index < score ? visual.scoreFill : visual.emptyScoreFill });
    }
  }

  private createLabel(node: SceneNode, visual: PixiJourneyNodeVisual): Container {
    const content = new Container();
    const section = createPixiText(
      truncateTextToWidth(visual.presentation.section, Math.max(20, node.size.width - 92), 5.8),
      { size: 10, weight: '700', fill: visual.subText }
    );
    section.position.set(12, 10);
    const task = createPixiText(
      truncateTextToWidth(visual.presentation.task, node.size.width - 24, 7),
      { size: 14, weight: '700', fill: visual.text }
    );
    task.position.set(12, 48);
    const actor = createPixiText(
      truncateTextToWidth(visual.presentation.actor, node.size.width - 24, 6.2),
      { size: 11, weight: '500', fill: visual.subText }
    );
    actor.position.set(12, 76);
    const title = createPixiText(
      truncateTextToWidth(visual.presentation.title, node.size.width - 24, 5.7),
      { size: 9, weight: '500', fill: visual.subText }
    );
    title.position.set(12, Math.min(node.size.height - 19, 101));
    content.addChild(section, task, actor, title);
    return content;
  }
}
