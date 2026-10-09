/**
 * Test-only readers for the endpoint tangents a browser derives for
 * `orient="auto"` markers — a zero tangent is the marker-alignment bug the
 * production module repairs. Not imported by shipped code.
 */

import { endOf, parsePath, type Command, type Point } from './curvePathMarkerTangents';

function tangentAt(command: Command, start: Point, at: 'start' | 'end'): Point | null {
    if (command.type === 'M') return null;
    if (command.type === 'L') {
        const end = endOf(command);
        return { x: end.x - start.x, y: end.y - start.y };
    }
    const [c1, c2, end] = command.points;
    if (at === 'start') return { x: c1.x - start.x, y: c1.y - start.y };
    return { x: end.x - c2.x, y: end.y - c2.y };
}

/** Tangent a browser reads for `marker-end` — zero means the arrowhead angle collapses. */
export function readPathEndTangent(path: string): Point | null {
    const commands = parsePath(path);
    if (!commands || commands.length < 2) return null;
    const last = commands.length - 1;
    return tangentAt(commands[last], endOf(commands[last - 1]), 'end');
}

/** Tangent a browser reads for `marker-start`. */
export function readPathStartTangent(path: string): Point | null {
    const commands = parsePath(path);
    if (!commands || commands.length < 2) return null;
    return tangentAt(commands[1], endOf(commands[0]), 'start');
}
