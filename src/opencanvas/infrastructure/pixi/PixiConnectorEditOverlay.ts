import { Graphics } from 'pixi.js';
import { connectorEditHandles, type ConnectorEditHandle } from '../../domain/connectors/editing';
import { projectConnector } from '../../domain/connectors/routeProjection';
import type { SceneConnector, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';

const ACTIVE = 0xe95420;
const ACTIVE_DEEP = 0xc2410c;
const SURFACE = 0xffffff;

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

  draw(
    page: ScenePage,
    connector: SceneConnector,
    zoom: number,
    activeHandle: ConnectorEditHandle | null = null
  ): void {
    this.graphics.clear();
    const projected = projectConnector(page, connector);
    if (!projected) return;
    const scale = 1 / Math.max(zoom, 0.05);
    const first = projected.samples[0];
    if (first) {
      this.graphics.moveTo(first.x, first.y);
      for (const point of projected.samples.slice(1)) this.graphics.lineTo(point.x, point.y);
      this.graphics.stroke({ color: ACTIVE, alpha: 0.9, width: 2.5 * scale });
    }
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
    const radius = (handle.kind === 'segment' ? 3.5 : 5) * scale;
    const fill = active ? ACTIVE : SURFACE;
    const width = (active ? 2.5 : 1.75) * scale;
    if (handle.kind === 'endpoint') {
      this.graphics.rect(handle.point.x - radius, handle.point.y - radius, radius * 2, radius * 2);
    } else if (handle.kind === 'waypoint') {
      drawDiamond(this.graphics, handle.point, radius);
    } else {
      this.graphics.circle(handle.point.x, handle.point.y, radius);
    }
    this.graphics.fill({ color: fill }).stroke({ color: active ? ACTIVE_DEEP : ACTIVE, width });
  }
}
