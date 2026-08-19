import { areStructurallyEqual } from '../../domain/commands/equality';
import type { DocumentCommand } from '../../domain/commands/types';
import type { JsonObject, JsonValue } from '../../domain/document/json';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Bounds2d, Point2d, Size2d } from '../../domain/geometry/types';

const PRECISION_KEY = 'openCanvasPrecision';

export interface CanvasGuide { readonly axis: 'x' | 'y'; readonly position: number }
export interface CanvasPrecisionSettings {
  readonly gridEnabled: boolean;
  readonly snapEnabled: boolean;
  readonly gridSize: number;
  readonly subdivisions: number;
  readonly guides: readonly CanvasGuide[];
}

const DEFAULT_PRECISION: CanvasPrecisionSettings = {
  gridEnabled: false, snapEnabled: true, gridSize: 20, subdivisions: 1, guides: [],
};

export function resolveCanvasPrecisionSettings(page: ScenePage): CanvasPrecisionSettings {
  const value = page.extensions[PRECISION_KEY];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PRECISION;
  const settings = value as JsonObject;
  const guides = Array.isArray(settings.guides) ? settings.guides.flatMap((guide) =>
    guide && typeof guide === 'object' && !Array.isArray(guide)
      && (guide.axis === 'x' || guide.axis === 'y')
      && typeof guide.position === 'number' && Number.isFinite(guide.position)
      ? [{ axis: guide.axis, position: guide.position }] : []).slice(0, 200) : [];
  return {
    gridEnabled: settings.gridEnabled === true,
    snapEnabled: settings.snapEnabled !== false,
    gridSize: typeof settings.gridSize === 'number' && Number.isFinite(settings.gridSize)
      ? Math.min(1000, Math.max(1, settings.gridSize)) : 20,
    subdivisions: typeof settings.subdivisions === 'number' && Number.isInteger(settings.subdivisions)
      ? Math.min(16, Math.max(1, settings.subdivisions)) : 1,
    guides,
  };
}

export function buildSetCanvasPrecisionCommand(
  page: ScenePage, settings: CanvasPrecisionSettings
): DocumentCommand | null {
  const normalized = resolveCanvasPrecisionSettings({ ...page,
    extensions: { ...page.extensions, [PRECISION_KEY]: settings as unknown as JsonValue } });
  const after = { ...page, extensions: { ...page.extensions,
    [PRECISION_KEY]: normalized as unknown as JsonValue } };
  return areStructurallyEqual(page, after) ? null : {
    kind: 'set-page', id: `set-precision:${page.id}`, label: 'Update canvas precision',
    pageId: page.id, before: page, after,
  };
}

export interface NumericNodeGeometry {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
  readonly rotationDegrees: number;
}

export function buildSetNumericNodeGeometryCommand(
  page: ScenePage, nodeId: string, geometry: NumericNodeGeometry
): DocumentCommand | null {
  if (![geometry.x, geometry.y, geometry.width, geometry.height, geometry.rotationDegrees]
    .every(Number.isFinite) || geometry.width <= 0 || geometry.height <= 0) {
    throw new TypeError('Numeric geometry must be finite with positive dimensions.');
  }
  const before = page.nodes.find(({ id }) => id === nodeId);
  if (!before) throw new RangeError(`Node "${nodeId}" was not found.`);
  const after: SceneNode = { ...before, size: { width: geometry.width, height: geometry.height },
    transform: { ...before.transform, translation: { x: geometry.x, y: geometry.y },
      rotationRadians: geometry.rotationDegrees * Math.PI / 180 } };
  return areStructurallyEqual(before, after) ? null : {
    kind: 'set-node', id: `set-numeric-geometry:${nodeId}`, label: 'Set numeric geometry',
    pageId: page.id, before, after,
  };
}

export interface PrecisionSnapResult {
  readonly point: Point2d;
  readonly snappedX: number | null;
  readonly snappedY: number | null;
}

export function snapPrecisionPoint(
  point: Point2d, size: Size2d, settings: CanvasPrecisionSettings,
  otherBounds: readonly Bounds2d[], zoom: number, tolerancePx = 6
): PrecisionSnapResult {
  if (!settings.snapEnabled) return { point, snappedX: null, snappedY: null };
  const tolerance = tolerancePx / Math.max(0.01, zoom);
  const xCandidates = settings.guides.filter(({ axis }) => axis === 'x').map(({ position }) => position);
  const yCandidates = settings.guides.filter(({ axis }) => axis === 'y').map(({ position }) => position);
  if (settings.gridEnabled) {
    xCandidates.push(Math.round(point.x / settings.gridSize) * settings.gridSize);
    yCandidates.push(Math.round(point.y / settings.gridSize) * settings.gridSize);
  }
  for (const bounds of otherBounds) {
    xCandidates.push(bounds.x, bounds.x + bounds.width / 2 - size.width / 2, bounds.x + bounds.width - size.width);
    yCandidates.push(bounds.y, bounds.y + bounds.height / 2 - size.height / 2, bounds.y + bounds.height - size.height);
  }
  const nearest = (value: number, candidates: readonly number[]) => candidates
    .map((candidate) => ({ candidate, distance: Math.abs(candidate - value) }))
    .filter(({ distance }) => distance <= tolerance)
    .sort((a, b) => a.distance - b.distance || a.candidate - b.candidate)[0]?.candidate ?? null;
  const snappedX = nearest(point.x, xCandidates); const snappedY = nearest(point.y, yCandidates);
  return { point: { x: snappedX ?? point.x, y: snappedY ?? point.y }, snappedX, snappedY };
}
