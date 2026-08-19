import { Container, Graphics } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import type { Matrix2d, Point2d } from '../../domain/geometry/types';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, truncateTextToWidth } from './pixiText';
import { projectSequenceNodeVisual, type PixiSequenceNodeVisual } from './sequenceNodeVisual';

const PARTICIPANT_HEADER_HEIGHT = 48;
const ACTOR_HEIGHT = 40;
const MESSAGE_OFFSET = 20;
const MESSAGE_SPACING = 52;

export interface PixiSequenceNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

function drawLocalLine(
  graphics: Graphics,
  start: Point2d,
  end: Point2d,
  matrix: Matrix2d,
  color: number,
  width = 1.5
): void {
  const worldStart = applyMatrixToPoint(matrix, start);
  const worldEnd = applyMatrixToPoint(matrix, end);
  graphics
    .moveTo(worldStart.x, worldStart.y)
    .lineTo(worldEnd.x, worldEnd.y)
    .stroke({ color, width });
}

function drawDashedLifeline(
  graphics: Graphics,
  x: number,
  startY: number,
  endY: number,
  matrix: Matrix2d,
  color: number
): void {
  for (let y = startY; y < endY; y += 12) {
    drawLocalLine(graphics, { x, y }, { x, y: Math.min(y + 6, endY) }, matrix, color, 1.5);
  }
}

export class PixiSequenceNodeRenderer {
  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics
  ): PixiSequenceNodeDrawResult | null {
    const visual = projectSequenceNodeVisual(node);
    if (!visual) return null;
    switch (visual.presentation.kind) {
      case 'sequence_participant':
        return this.drawParticipant(node, matrix, graphics, visual);
      case 'sequence_note':
        return this.drawNote(node, matrix, graphics, visual);
      case 'sequence_fragment':
        return this.drawFragment(node, matrix, graphics, visual);
    }
  }

  private drawParticipant(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiSequenceNodeVisual
  ): PixiSequenceNodeDrawResult {
    const presentation = visual.presentation;
    if (presentation.kind !== 'sequence_participant') throw new TypeError('Expected participant.');
    const actorOffset = presentation.participantKind === 'actor' ? ACTOR_HEIGHT : 0;
    drawPixiLocalRect(
      graphics,
      { x: 0, y: actorOffset, width: node.size.width, height: PARTICIPANT_HEADER_HEIGHT },
      matrix,
      5
    );
    graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.5 });
    const centerX = node.size.width / 2;
    const lifelineStart = actorOffset + PARTICIPANT_HEADER_HEIGHT;
    drawDashedLifeline(graphics, centerX, lifelineStart, node.size.height, matrix, visual.stroke);
    for (const activation of presentation.activations) {
      const y = lifelineStart + MESSAGE_OFFSET + activation.startOrder * MESSAGE_SPACING;
      if (y >= node.size.height) continue;
      const height = Math.max(12, (activation.endOrder - activation.startOrder) * MESSAGE_SPACING);
      drawPixiLocalRect(
        graphics,
        { x: centerX - 6, y, width: 12, height: Math.min(height, node.size.height - y) },
        matrix,
        2
      );
      graphics.fill({ color: visual.accentFill }).stroke({ color: visual.stroke, width: 1 });
    }
    if (presentation.participantKind === 'actor') {
      const head = applyMatrixToPoint(matrix, { x: centerX, y: 9 });
      graphics.circle(head.x, head.y, 5).stroke({ color: visual.stroke, width: 1.5 });
      drawLocalLine(graphics, { x: centerX, y: 14 }, { x: centerX, y: 28 }, matrix, visual.stroke);
      drawLocalLine(
        graphics,
        { x: centerX - 9, y: 20 },
        { x: centerX + 9, y: 20 },
        matrix,
        visual.stroke
      );
      drawLocalLine(
        graphics,
        { x: centerX, y: 28 },
        { x: centerX - 8, y: 37 },
        matrix,
        visual.stroke
      );
      drawLocalLine(
        graphics,
        { x: centerX, y: 28 },
        { x: centerX + 8, y: 37 },
        matrix,
        visual.stroke
      );
    }
    const label = new Container();
    const title = createPixiText(truncateTextToWidth(presentation.label, node.size.width - 24, 7), {
      size: 12,
      weight: '600',
      fill: visual.text,
    });
    title.anchor.set(0.5, 0.5);
    title.position.set(
      centerX,
      actorOffset + PARTICIPANT_HEADER_HEIGHT / 2 - (presentation.alias ? 6 : 0)
    );
    label.addChild(title);
    if (presentation.alias) {
      const alias = createPixiText(
        truncateTextToWidth(presentation.alias, node.size.width - 28, 5.5),
        {
          size: 9,
          weight: '500',
          fill: visual.subText,
        }
      );
      alias.anchor.set(0.5, 0.5);
      alias.position.set(centerX, actorOffset + PARTICIPANT_HEADER_HEIGHT / 2 + 10);
      label.addChild(alias);
    }
    applyPixiNodeMatrix(label, matrix);
    return {
      label,
      debug: {
        id: node.id,
        kind: presentation.kind,
        shape: presentation.participantKind === 'actor' ? 'actor-lifeline' : 'participant-lifeline',
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: 'none',
        sequenceParticipantKind: presentation.participantKind,
        sequenceAlias: presentation.alias ?? null,
        activationCount: presentation.activations.length,
      },
    };
  }

  private drawNote(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiSequenceNodeVisual
  ): PixiSequenceNodeDrawResult {
    const presentation = visual.presentation;
    if (presentation.kind !== 'sequence_note') throw new TypeError('Expected sequence note.');
    drawPixiNodeOutline(graphics, 'rounded', node.size, matrix);
    graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.25 });
    drawPixiLocalRect(graphics, { x: 10, y: 10, width: 8, height: 8 }, matrix, 2);
    graphics.fill({ color: visual.accentFill }).stroke({ color: visual.stroke, width: 1 });
    const label = new Container();
    const note = createPixiText(presentation.label, {
      size: 11,
      weight: '500',
      fill: visual.text,
      wrapWidth: Math.max(40, node.size.width - 24),
    });
    note.position.set(12, 27);
    label.addChild(note);
    applyPixiNodeMatrix(label, matrix);
    return {
      label,
      debug: {
        id: node.id,
        kind: presentation.kind,
        shape: 'sequence-note',
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: 'none',
        sequenceOrder: presentation.order,
        sequenceTargetCount: presentation.targets.length,
        sequenceFragmentType: presentation.fragment?.type ?? null,
      },
    };
  }

  private drawFragment(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiSequenceNodeVisual
  ): PixiSequenceNodeDrawResult {
    const presentation = visual.presentation;
    if (presentation.kind !== 'sequence_fragment') throw new TypeError('Expected fragment.');
    drawPixiNodeOutline(graphics, 'rectangle', node.size, matrix);
    graphics.fill({ color: visual.fill, alpha: 0.3 }).stroke({ color: visual.stroke, width: 1.25 });
    drawPixiLocalRect(
      graphics,
      { x: 0, y: 0, width: Math.min(72, node.size.width), height: 24 },
      matrix
    );
    graphics.fill({ color: visual.accentFill }).stroke({ color: visual.stroke, width: 1 });
    const label = new Container();
    const type = createPixiText(truncateTextToWidth(presentation.label, 60, 6.2), {
      size: 10,
      weight: '700',
      fill: visual.text,
    });
    type.position.set(8, 6);
    label.addChild(type);
    if (presentation.condition) {
      const condition = createPixiText(
        truncateTextToWidth(presentation.condition, node.size.width - 92, 6.2),
        { size: 10, weight: '500', fill: visual.subText }
      );
      condition.position.set(82, 6);
      label.addChild(condition);
    }
    applyPixiNodeMatrix(label, matrix);
    return {
      label,
      debug: {
        id: node.id,
        kind: presentation.kind,
        shape: 'sequence-fragment',
        fill: visual.fill,
        fillAlpha: 0.3,
        stroke: visual.stroke,
        mediaState: 'none',
        sequenceOrder: presentation.order,
        sequenceFragmentId: presentation.fragmentId,
      },
    };
  }
}
