import { Container, Graphics } from 'pixi.js';
import { createBounds2d } from '../../domain/geometry/bounds';
import type { Matrix2d } from '../../domain/geometry/types';
import type { SceneNode } from '../../domain/document/types';
import type {
  ClassMemberPresentation,
  EntityFieldPresentation,
} from '../../domain/nodes/classEntityNodePresentation';
import {
  projectClassEntityNodeVisual,
  type PixiClassEntityNodeVisual,
} from './classEntityNodeVisual';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { drawPixiLocalRect, drawPixiNodeOutline } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';
import { createPixiText, truncateTextToWidth } from './pixiText';

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 18;
const CONTENT_PADDING = 10;
const ENTITY_KEY_COLUMN_WIDTH = 54;
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export interface PixiClassEntityNodeDrawResult {
  readonly label: Container;
  readonly debug: PixiNodeDebugRecord;
}

function visibleRowCount(totalRows: number, availableSlots: number): number {
  return totalRows <= availableSlots ? totalRows : Math.max(0, availableSlots - 1);
}

function addOverflowRow(
  container: Container,
  remaining: number,
  x: number,
  y: number,
  visual: PixiClassEntityNodeVisual
): void {
  if (remaining <= 0) return;
  const overflow = createPixiText(`… ${remaining} more`, {
    size: 10,
    weight: '500',
    fill: visual.subText,
    family: MONO_FONT,
  });
  overflow.position.set(x, y + 2);
  container.addChild(overflow);
}

function addClassRows(
  container: Container,
  rows: readonly ClassMemberPresentation[],
  visibleCount: number,
  x: number,
  y: number,
  width: number,
  visual: PixiClassEntityNodeVisual
): void {
  rows.slice(0, visibleCount).forEach((row, index) => {
    const symbol = createPixiText(row.symbol, {
      size: 11,
      weight: '700',
      fill: visual.subText,
      family: MONO_FONT,
    });
    symbol.position.set(x, y + index * ROW_HEIGHT + 1);
    const signature = createPixiText(truncateTextToWidth(row.signature, width - 18), {
      size: 11,
      weight: '400',
      fill: visual.text,
      family: MONO_FONT,
    });
    signature.position.set(x + 16, y + index * ROW_HEIGHT + 1);
    container.addChild(symbol, signature);
  });
  addOverflowRow(container, rows.length - visibleCount, x, y + visibleCount * ROW_HEIGHT, visual);
}

function entityKeyLabel(field: EntityFieldPresentation): string {
  return [
    field.isPrimaryKey ? 'PK' : '',
    field.isForeignKey ? 'FK' : '',
    field.isUnique ? 'UQ' : '',
    field.isNotNull ? 'NN' : '',
  ]
    .filter(Boolean)
    .join('·');
}

function addEntityRows(
  container: Container,
  rows: readonly EntityFieldPresentation[],
  visibleCount: number,
  node: SceneNode,
  visual: PixiClassEntityNodeVisual
): void {
  rows.slice(0, visibleCount).forEach((row, index) => {
    const y = HEADER_HEIGHT + CONTENT_PADDING + index * ROW_HEIGHT;
    const keys = entityKeyLabel(row);
    const keyText = createPixiText(keys, {
      size: 9,
      weight: '700',
      fill: visual.subText,
      family: MONO_FONT,
    });
    keyText.position.set(CONTENT_PADDING, y + 2);
    const name = createPixiText(
      truncateTextToWidth(row.name || 'field', Math.max(20, node.size.width * 0.48 - 42)),
      { size: 11, weight: '500', fill: visual.text, family: MONO_FONT }
    );
    name.position.set(CONTENT_PADDING + ENTITY_KEY_COLUMN_WIDTH, y + 1);
    const type = createPixiText(
      truncateTextToWidth(row.dataType, Math.max(20, node.size.width * 0.4)),
      {
        size: 10,
        weight: '400',
        fill: visual.subText,
        family: MONO_FONT,
      }
    );
    type.anchor.set(1, 0);
    type.position.set(node.size.width - CONTENT_PADDING, y + 2);
    container.addChild(keyText, name, type);
  });
  addOverflowRow(
    container,
    rows.length - visibleCount,
    CONTENT_PADDING,
    HEADER_HEIGHT + CONTENT_PADDING + visibleCount * ROW_HEIGHT,
    visual
  );
}

export class PixiClassEntityNodeRenderer {
  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics
  ): PixiClassEntityNodeDrawResult | null {
    const visual = projectClassEntityNodeVisual(node);
    if (!visual) return null;
    this.drawChrome(node, matrix, graphics, visual);
    const label =
      visual.presentation.kind === 'class'
        ? this.createClassLabel(node, visual)
        : this.createEntityLabel(node, visual);
    applyPixiNodeMatrix(label, matrix);
    const rowCount =
      visual.presentation.kind === 'class'
        ? visual.presentation.attributes.length + visual.presentation.methods.length
        : visual.presentation.fields.length;
    return {
      label,
      debug: {
        id: node.id,
        kind: visual.presentation.kind,
        shape: visual.presentation.kind === 'class' ? 'class-compartments' : 'entity-table',
        fill: visual.fill,
        stroke: visual.stroke,
        mediaState: 'none',
        rowCount,
        compartmentCount: visual.presentation.kind === 'class' ? 3 : 2,
      },
    };
  }

  private drawChrome(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    visual: PixiClassEntityNodeVisual
  ): void {
    drawPixiNodeOutline(graphics, 'rounded', node.size, matrix);
    graphics.fill({ color: visual.fill }).stroke({ color: visual.stroke, width: 1.5 });
    drawPixiLocalRect(
      graphics,
      createBounds2d(1, 1, node.size.width - 2, HEADER_HEIGHT - 1),
      matrix,
      11
    );
    graphics.fill({ color: visual.headerFill });
    drawPixiLocalRect(graphics, createBounds2d(0, HEADER_HEIGHT, node.size.width, 1), matrix);
    graphics.fill({ color: visual.stroke });
    if (visual.presentation.kind === 'class') {
      const availableRows = Math.max(
        2,
        Math.floor((node.size.height - HEADER_HEIGHT - CONTENT_PADDING * 2) / ROW_HEIGHT)
      );
      const attributeSlots = Math.max(1, Math.ceil(availableRows / 2));
      const dividerY = HEADER_HEIGHT + CONTENT_PADDING + (attributeSlots + 0.5) * ROW_HEIGHT;
      drawPixiLocalRect(graphics, createBounds2d(0, dividerY, node.size.width, 1), matrix);
      graphics.fill({ color: visual.stroke });
    }
  }

  private createHeader(
    node: SceneNode,
    visual: PixiClassEntityNodeVisual,
    familyLabel: string,
    stereotype?: string
  ): Container {
    const content = new Container();
    const context = createPixiText(stereotype ? `«${stereotype}»` : familyLabel, {
      size: 9,
      weight: '600',
      fill: visual.subText,
    });
    context.anchor.set(0.5, 0);
    context.position.set(node.size.width / 2, 6);
    const title = createPixiText(
      truncateTextToWidth(visual.presentation.label, node.size.width - 24, 7.2),
      {
        size: 13,
        weight: '700',
        fill: visual.text,
      }
    );
    title.anchor.set(0.5, 0);
    title.position.set(node.size.width / 2, 21);
    content.addChild(context, title);
    return content;
  }

  private createClassLabel(node: SceneNode, visual: PixiClassEntityNodeVisual): Container {
    if (visual.presentation.kind !== 'class') return new Container();
    const content = this.createHeader(node, visual, 'Class', visual.presentation.stereotype);
    const availableRows = Math.max(
      2,
      Math.floor((node.size.height - HEADER_HEIGHT - CONTENT_PADDING * 2) / ROW_HEIGHT)
    );
    const attributeSlots = Math.max(1, Math.ceil(availableRows / 2));
    const methodSlots = Math.max(1, availableRows - attributeSlots);
    const visibleAttributes = visibleRowCount(
      visual.presentation.attributes.length,
      attributeSlots
    );
    const attributesHeight = attributeSlots * ROW_HEIGHT;
    addClassRows(
      content,
      visual.presentation.attributes,
      visibleAttributes,
      CONTENT_PADDING,
      HEADER_HEIGHT + CONTENT_PADDING,
      node.size.width - CONTENT_PADDING * 2,
      visual
    );
    addClassRows(
      content,
      visual.presentation.methods,
      visibleRowCount(visual.presentation.methods.length, methodSlots),
      CONTENT_PADDING,
      HEADER_HEIGHT + CONTENT_PADDING + attributesHeight + ROW_HEIGHT,
      node.size.width - CONTENT_PADDING * 2,
      visual
    );
    return content;
  }

  private createEntityLabel(node: SceneNode, visual: PixiClassEntityNodeVisual): Container {
    if (visual.presentation.kind !== 'er_entity') return new Container();
    const content = this.createHeader(node, visual, 'Entity');
    const availableSlots = Math.max(
      1,
      Math.floor((node.size.height - HEADER_HEIGHT - CONTENT_PADDING * 2) / ROW_HEIGHT)
    );
    const visibleCount = visibleRowCount(visual.presentation.fields.length, availableSlots);
    addEntityRows(content, visual.presentation.fields, visibleCount, node, visual);
    return content;
  }
}
