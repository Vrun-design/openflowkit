export interface SvgPoint {
  x: number;
  y: number;
}

export interface RawSvgNodeLayout {
  rawId?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawSvgEdgeLayout {
  rawId?: string;
  path: string;
  points: SvgPoint[];
}

export interface RawExtractedMermaidGeometry {
  nodes: RawSvgNodeLayout[];
  clusters: RawSvgNodeLayout[];
  edges: RawSvgEdgeLayout[];
}

const CANVAS_PADDING = 40;

export function parseSvgPathPoints(d: string): SvgPoint[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const points: SvgPoint[] = [];

  let index = 0;
  let command = '';
  let current = { x: 0, y: 0 };
  let subpathStart = { x: 0, y: 0 };

  function readNumber(): number {
    return Number(tokens[index++]);
  }

  function pushPoint(point: SvgPoint): void {
    points.push({ x: point.x, y: point.y });
    current = point;
  }

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      index += 1;
    }

    switch (command) {
      case 'M':
      case 'L': {
        const x = readNumber();
        const y = readNumber();
        pushPoint({ x, y });
        if (command === 'M') subpathStart = { x, y };
        break;
      }
      case 'm':
      case 'l': {
        const x = current.x + readNumber();
        const y = current.y + readNumber();
        pushPoint({ x, y });
        if (command === 'm') subpathStart = { x, y };
        break;
      }
      case 'H': {
        pushPoint({ x: readNumber(), y: current.y });
        break;
      }
      case 'h': {
        pushPoint({ x: current.x + readNumber(), y: current.y });
        break;
      }
      case 'V': {
        pushPoint({ x: current.x, y: readNumber() });
        break;
      }
      case 'v': {
        pushPoint({ x: current.x, y: current.y + readNumber() });
        break;
      }
      case 'C': {
        index += 4;
        const x = readNumber();
        const y = readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'c': {
        index += 4;
        const x = current.x + readNumber();
        const y = current.y + readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'S':
      case 'Q': {
        index += 2;
        const x = readNumber();
        const y = readNumber();
        pushPoint({ x, y });
        break;
      }
      case 's':
      case 'q': {
        index += 2;
        const x = current.x + readNumber();
        const y = current.y + readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'T': {
        const x = readNumber();
        const y = readNumber();
        pushPoint({ x, y });
        break;
      }
      case 't': {
        const x = current.x + readNumber();
        const y = current.y + readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'A': {
        index += 5;
        const x = readNumber();
        const y = readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'a': {
        index += 5;
        const x = current.x + readNumber();
        const y = current.y + readNumber();
        pushPoint({ x, y });
        break;
      }
      case 'Z':
      case 'z': {
        pushPoint({ x: subpathStart.x, y: subpathStart.y });
        break;
      }
      default: {
        index += 1;
        break;
      }
    }
  }

  return points;
}

function shiftPathData(path: string, shiftX: number, shiftY: number): string {
  const tokens = path.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  if (tokens.length === 0) return path;

  const shifted: string[] = [];
  let index = 0;
  let command = '';

  const readNum = (): number => Number(tokens[index++]);
  const pushNum = (v: number): void => {
    shifted.push(Number.isInteger(v) ? String(v) : String(Number(v.toFixed(3))));
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      shifted.push(token);
      index += 1;
      continue;
    }

    switch (command) {
      case 'M':
      case 'L':
      case 'T': {
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        break;
      }
      case 'H': {
        pushNum(readNum() + shiftX);
        break;
      }
      case 'V': {
        pushNum(readNum() + shiftY);
        break;
      }
      case 'C': {
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        break;
      }
      case 'S':
      case 'Q': {
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        break;
      }
      case 'A': {
        pushNum(readNum());
        pushNum(readNum());
        pushNum(readNum());
        pushNum(readNum());
        pushNum(readNum());
        pushNum(readNum() + shiftX);
        pushNum(readNum() + shiftY);
        break;
      }
      default: {
        shifted.push(tokens[index++]);
        break;
      }
    }
  }

  return shifted.join(' ');
}

export function normalizeRawGeometry(
  nodes: RawSvgNodeLayout[],
  clusters: RawSvgNodeLayout[],
  edges: RawSvgEdgeLayout[]
): RawExtractedMermaidGeometry {
  const allX = [
    ...nodes.map((n) => n.x),
    ...clusters.map((c) => c.x),
    ...edges.flatMap((e) => e.points.map((p) => p.x)),
  ];
  const allY = [
    ...nodes.map((n) => n.y),
    ...clusters.map((c) => c.y),
    ...edges.flatMap((e) => e.points.map((p) => p.y)),
  ];

  if (allX.length === 0 || allY.length === 0) return { nodes, clusters, edges };

  const shiftX = -Math.min(...allX) + CANVAS_PADDING;
  const shiftY = -Math.min(...allY) + CANVAS_PADDING;
  const shiftPt = (p: SvgPoint) => ({ x: p.x + shiftX, y: p.y + shiftY });

  return {
    nodes: nodes.map((n) => ({ ...n, x: n.x + shiftX, y: n.y + shiftY })),
    clusters: clusters.map((c) => ({ ...c, x: c.x + shiftX, y: c.y + shiftY })),
    edges: edges.map((e) => ({
      ...e,
      points: e.points.map(shiftPt),
      path: shiftPathData(e.path, shiftX, shiftY),
    })),
  };
}
