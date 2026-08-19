export const GEOMETRY_EPSILON = 1e-9;

function formatGeometryField(field: string): string {
  return field ? `Geometry field "${field}"` : 'Geometry value';
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function requireFiniteNumber(value: unknown, field: string): number {
  if (!isFiniteNumber(value)) {
    throw new RangeError(`${formatGeometryField(field)} must be a finite number.`);
  }
  return Object.is(value, -0) ? 0 : value;
}

export function requireNonNegativeNumber(value: unknown, field: string): number {
  const finiteValue = requireFiniteNumber(value, field);
  if (finiteValue < 0) {
    throw new RangeError(`${formatGeometryField(field)} must be non-negative.`);
  }
  return finiteValue;
}

export function areNearlyEqual(left: number, right: number, epsilon = GEOMETRY_EPSILON): boolean {
  const safeLeft = requireFiniteNumber(left, 'left');
  const safeRight = requireFiniteNumber(right, 'right');
  const safeEpsilon = requireNonNegativeNumber(epsilon, 'epsilon');
  return Math.abs(safeLeft - safeRight) <= safeEpsilon;
}
