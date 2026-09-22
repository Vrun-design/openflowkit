import { Graphics } from 'pixi.js';
import { connectorEditHandles, type ConnectorEditHandle } from '../../domain/connectors/editing';
import { projectConnector } from '../../domain/connectors/routeProjection';
import type { SceneConnector, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';

import { CHROME_ACCENT as ACTIVE, CHROME_ACCENT_DEEP as ACTIVE_DEEP, CHROME_SURFACE as SURFACE } from './chrome';

function sameHandle(left: ConnectorEditHandle | null, right: ConnectorEditHandle): boolean {
  if (!left || left.kind !== right.kind) return false;
  if (left.kind === 'endpoint' && right.kind === 'endpoint') return left.role === right.role;
  if (left.kind === 'waypoint' && right.kind === 'waypoint') return left.index === right.index;
  if (left.kind === 'segment' && right.kind === 'segment') return left.index === right.index;
  return left.kind === 'control' && right.kind === 'control' && left.index === right.index;
}

function drawDiamond(graphics: Graphics, point: Point2d, radius: number): void {
  graphics.poly([
    point.x,
    point.y - radius,
    point.x + radius,
    point.y,
    point.x,
    point.y + radius,
    point.x - radius,
    point.y,
  ]);
}

export class PixiConnectorEditOverlay {
  readonly graphics = new Graphics();

  clear(): void {
    this.graphics.clear();
  }

  /** Every selected connector gets the highlight; handles only when there is one. */
  draw(
    page: ScenePage,
    connectors: readonly SceneConnector[],
    zoom: number,
    activeHandle: ConnectorEditHandle | null = null
  ): void {
    this.graphics.clear();
    const scale = 1 / Math.max(zoom, 0.05);
    const projections = connectors.map((connector) => [connector, projectConnector(page, connector)] as const);
    for (const [, projected] of projections) {
      const [first, ...rest] = projected?.samples ?? [];
      if (!first) continue;
      this.graphics.moveTo(first.x, first.y);
      for (const point of rest) this.graphics.lineTo(point.x, point.y);
      this.graphics.stroke({ color: ACTIVE, alpha: 0.85, width: 1.5 * scale });
    }
    if (projections.length !== 1) return;
    const [connector, projected] = projections[0]!;
    if (!projected) return;
    const first = projected.samples[0];
    const handles = connectorEditHandles(page, connector);
    const controls = handles.filter(
      (handle): handle is Extract<ConnectorEditHandle, { kind: 'control' }> =>
        handle.kind === 'control'
    );
    if (controls.length === 2 && first) {
      const last = projected.samples.at(-1)!;
      this.graphics
        .moveTo(first.x, first.y)
        .lineTo(controls[0].point.x, controls[0].point.y)
        .moveTo(last.x, last.y)
        .lineTo(controls[1].point.x, controls[1].point.y)
        .stroke({ color: ACTIVE, alpha: 0.45, width: scale });
    }
    for (const handle of handles) this.drawHandle(handle, scale, sameHandle(activeHandle, handle));
  }

  private drawHandle(handle: ConnectorEditHandle, scale: number, active: boolean): void {
    const radius = (handle.kind === 'segment' ? 3 : 4.5) * scale;
    const fill = active ? ACTIVE : SURFACE;
    const width = (active ? 1.5 : 1.25) * scale;
    if (handle.kind === 'endpoint') {
      this.graphics.circle(handle.point.x, handle.point.y, radius);
    } else if (handle.kind === 'waypoint') {
      drawDiamond(this.graphics, handle.point, radius);
    } else {
      this.graphics.circle(handle.point.x, handle.point.y, radius);
    }
    this.graphics.fill({ color: fill }).stroke({ color: active ? ACTIVE_DEEP : ACTIVE, width });
  }
}
