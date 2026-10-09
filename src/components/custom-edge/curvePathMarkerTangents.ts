/**
 * SVG `marker-end` / `marker-start` with `orient="auto"` take their angle from the
 * path tangent at the vertex they sit on. d3's curve generators — and the duplicated
 * endpoint anchoring in `buildCurvedPath` — emit zero-length commands and cubics whose
 * control points collapse onto the endpoint, which makes that tangent zero. Browsers
 * then fall back to 0deg, so arrowheads point right no matter which way the edge runs.
 *
 * These helpers rewrite such a path into a geometrically equivalent one with a
 * well-defined tangent at both ends.
 */

export interface Point {
    x: number;
    y: number;
}

type CommandType = 'M' | 'L' | 'C';

export interface Command {
    type: CommandType;
    /** `C`: [control1, control2, end]. `M` / `L`: [end]. */
    points: Point[];
}

const COMMAND_PATTERN = /([A-Za-z])([^A-Za-z]*)/g;
const COORDS_PER_COMMAND: Record<CommandType, number> = { M: 1, L: 1, C: 3 };
/** Fraction of the incoming handle kept when pulling a collapsed control point off the endpoint. */
const HANDLE_PULL = 0.02;
const EPSILON = 1e-6;

function samePoint(a: Point, b: Point): boolean {
    return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

export function parsePath(path: string): Command[] | null {
    const trimmed = path.trim();
    if (!trimmed.startsWith('M')) return null;

    const commands: Command[] = [];
    COMMAND_PATTERN.lastIndex = 0;
    let match = COMMAND_PATTERN.exec(trimmed);
    let consumed = 0;

    while (match) {
        const type = match[1] as CommandType;
        if (type !== 'M' && type !== 'L' && type !== 'C') return null;

        const numbers = match[2]
            .split(/[,\s]+/)
            .filter((value) => value.length > 0)
            .map(Number);
        if (numbers.some((value) => !Number.isFinite(value))) return null;
        if (numbers.length !== COORDS_PER_COMMAND[type] * 2) return null;

        const points: Point[] = [];
        for (let i = 0; i < numbers.length; i += 2) {
            points.push({ x: numbers[i], y: numbers[i + 1] });
        }
        commands.push({ type, points });

        consumed = match.index + match[0].length;
        match = COMMAND_PATTERN.exec(trimmed);
    }

    if (consumed !== trimmed.length) return null;
    if (commands.length === 0 || commands[0].type !== 'M') return null;
    return commands;
}

export function endOf(command: Command): Point {
    return command.points[command.points.length - 1];
}

/** A command that neither moves nor draws — safe to delete. */
function isNoOp(command: Command, start: Point): boolean {
    if (command.type === 'M') return false;
    return command.points.every((point) => samePoint(point, start));
}

function formatNumber(value: number): string {
    const rounded = Math.round(value * 1000) / 1000;
    return String(Object.is(rounded, -0) ? 0 : rounded);
}

function serialize(commands: Command[]): string {
    return commands
        .map(
            (command) =>
                command.type
                + command.points.map((point) => `${formatNumber(point.x)},${formatNumber(point.y)}`).join(',')
        )
        .join('');
}

function lerp(from: Point, to: Point, t: number): Point {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * A cubic whose two control points both sit on one of its endpoints traces exactly the
 * straight chord between its endpoints, so it can be replaced by a `lineTo`.
 */
function isCollapsedCubic(command: Command, start: Point): boolean {
    if (command.type !== 'C') return false;
    const [c1, c2, end] = command.points;
    if (!samePoint(c1, c2)) return false;
    return samePoint(c1, start) || samePoint(c1, end);
}

function repairTail(command: Command, start: Point): Command {
    if (command.type !== 'C') return command;
    if (isCollapsedCubic(command, start)) return { type: 'L', points: [endOf(command)] };

    const [c1, c2, end] = command.points;
    if (!samePoint(c2, end)) return command;

    // As t -> 1 the tangent direction is (end - c1); pull c2 back along it so the
    // browser can read that direction off the last control point.
    const reference = samePoint(c1, end) ? start : c1;
    if (samePoint(reference, end)) return command;
    return { type: 'C', points: [c1, lerp(end, reference, HANDLE_PULL), end] };
}

function repairHead(command: Command, start: Point): Command {
    if (command.type !== 'C') return command;
    if (isCollapsedCubic(command, start)) return { type: 'L', points: [endOf(command)] };

    const [c1, c2, end] = command.points;
    if (!samePoint(c1, start)) return command;

    const reference = samePoint(c2, start) ? end : c2;
    if (samePoint(reference, start)) return command;
    return { type: 'C', points: [lerp(start, reference, HANDLE_PULL), c2, end] };
}

/**
 * Strip degenerate head/tail commands and give the first and last drawing command a
 * readable tangent, so `orient="auto"` markers follow the edge direction.
 * Returns the input untouched when it is not a plain M/L/C path.
 */
export function normalizeMarkerTangents(path: string): string {
    const commands = parsePath(path);
    if (!commands) return path;

    const kept: Command[] = [commands[0]];
    let cursor = endOf(commands[0]);
    for (let i = 1; i < commands.length; i += 1) {
        const command = commands[i];
        if (isNoOp(command, cursor)) continue;
        kept.push(command);
        cursor = endOf(command);
    }
    if (kept.length < 2) return path;

    const startPoints: Point[] = [];
    let running = endOf(kept[0]);
    for (let i = 1; i < kept.length; i += 1) {
        startPoints[i] = running;
        running = endOf(kept[i]);
    }

    kept[1] = repairHead(kept[1], startPoints[1]);
    const last = kept.length - 1;
    kept[last] = repairTail(kept[last], startPoints[last]);

    return serialize(kept);
}
