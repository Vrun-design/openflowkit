import type { MapFacts } from './types';

// A deterministic ~500-file repo with six parts, for tests that need realistic shape: nested folders,
// a 18-file flat folder, imports mostly inside a folder, a few across parts, and two parts that import
// nothing from anywhere (disconnected on the map).

const WORDS = ['Canvas', 'Editor', 'Panel', 'Tool', 'Menu', 'State', 'Store', 'Render', 'Layout', 'Input', 'Export', 'Theme', 'Route', 'Model', 'Query', 'Cache', 'Event', 'Queue', 'Token', 'Chart'];

/** Small seeded generator (mulberry32): same numbers everywhere, no Math.random. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYOUT: Record<string, Record<string, number>> = {
  app: { canvas: 22, editor: 26, panels: 24, tools: 18, services: 16, state: 14, ui: 30, lib: 18, 'features/export': 12, 'features/share': 10, 'features/ai': 14 },
  server: { routes: 16, models: 12, lib: 8, middleware: 6, jobs: 8 },
  mcp: { tools: 14, lib: 10, resources: 6 },
  worker: { src: 10 },
  action: { src: 6 },
  docs: { pages: 40, components: 22, content: 30, util: 9 },
};

// Which parts may import which (everything else stays inside its part).
const CROSS: [string, string, number][] = [['docs', 'app', 0.5], ['app', 'server', 0.1], ['server', 'app', 0.05], ['mcp', 'server', 0.3], ['mcp', 'app', 0.1]];

export function syntheticRepo(seed = 7): MapFacts {
  const next = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(next() * xs.length)];
  const byPart = new Map<string, string[]>();
  const byFolder = new Map<string, string[]>();
  const files: MapFacts['files'] = [];
  for (const [part, folders] of Object.entries(LAYOUT)) {
    for (const [folder, count] of Object.entries(folders)) {
      for (let i = 0; i < Math.round(count * 1.25); i++) {
        const path = `${part}/${folder}/${pick(WORDS)}${pick(WORDS)}${i}.ts`;
        files.push({ path, loc: 20 + Math.floor(next() * 300) });
        (byPart.get(part) ?? byPart.set(part, []).get(part)!).push(path);
        (byFolder.get(`${part}/${folder}`) ?? byFolder.set(`${part}/${folder}`, []).get(`${part}/${folder}`)!).push(path);
      }
    }
  }
  const imports: MapFacts['imports'] = [];
  for (const f of files) {
    const [part, ...rest] = f.path.split('/');
    const folder = `${part}/${rest.slice(0, -1).join('/')}`;
    for (let k = 0; k < 3; k++) {
      const roll = next();
      const cross = CROSS.filter(([from]) => from === part);
      let pool = byFolder.get(folder)!;
      if (roll > 0.8) pool = byPart.get(part)!;
      for (const [, to, p] of cross) if (roll > 1 - p * 0.1) pool = byPart.get(to)!;
      const target = pick(pool);
      if (target !== f.path) imports.push({ from: f.path, to: target, line: k + 1, text: `import x from '${target}';` });
    }
  }
  return {
    files, imports,
    parts: Object.keys(LAYOUT).map((dir) => ({ id: dir, name: dir, dir })),
    source: { repo: 'acme/synthetic' },
  };
}
