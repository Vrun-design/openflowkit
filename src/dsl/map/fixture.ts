import type { MapFacts } from './types';

// A small shop: two parts (web, server), a chain folder (web/lib/deep/only), a 16-file flat folder
// (server/routes), imports both ways between the parts, a dir import and an external call.
const routes = Array.from({ length: 16 }, (_, i) => `server/routes/r${String(i).padStart(2, '0')}.ts`);
const imp = (from: string, to: string, line: number, toKind?: 'dir') => ({ from, to, line, text: `import x from '${to}';`, ...(toKind ? { toKind } : {}) });

export const FIXTURE: MapFacts = {
  source: { repo: 'acme/shop', sha: 'abc1234' },
  parts: [
    { id: 'web', name: 'Web app', dir: 'web', desc: 'The storefront.' },
    { id: 'server', name: 'API server', dir: 'server' },
  ],
  files: [
    { path: 'web/App.tsx', loc: 120 },
    { path: 'web/ui/Button.tsx', loc: 40 },
    { path: 'web/ui/Card.tsx', loc: 60 },
    { path: 'web/lib/deep/only/util.ts', loc: 30 },
    { path: 'server/index.ts', loc: 25 },
    ...routes.map((path, i) => ({ path, loc: 10 + i })),
    { path: 'README.md', loc: 5 },
  ],
  imports: [
    imp('web/App.tsx', 'web/ui', 1, 'dir'),
    imp('web/App.tsx', 'web/lib/deep', 2, 'dir'),
    imp('web/App.tsx', 'server/routes/r00.ts', 3),
    imp('web/App.tsx', 'server/routes/r00.ts', 4),
    imp('web/App.tsx', 'server/routes/r01.ts', 5),
    imp('web/ui/Button.tsx', 'web/ui/Card.tsx', 1),
    imp('server/routes/r00.ts', 'web/lib/deep/only/util.ts', 1),
    imp('server/routes/r01.ts', 'web/lib/deep/only/util.ts', 1),
    imp('server/routes/r02.ts', 'web/lib/deep/only/util.ts', 1),
    imp('server/index.ts', 'server/routes/r00.ts', 1),
    imp('server/index.ts', 'server/routes/r01.ts', 2),
    imp('server/index.ts', 'server/routes/r02.ts', 3),
    imp('server/index.ts', 'nope.ts', 4),
  ],
  externals: [{ id: 'ext:stripe', name: 'Stripe' }],
  links: [
    { from: 'server/routes/r01.ts', to: 'ext:stripe', kind: 'call', label: 'charges', evidence: [{ file: 'server/routes/r01.ts', line: 9, text: 'stripe.charges.create()' }] },
    { from: 'server/routes/r01.ts', to: 'ext:missing', kind: 'call', evidence: [] },
  ],
};
