import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Phase 12.6: public/sw.js is a kill switch for v1's worker; v2 must never register one,
// in any build. The e2e runs on the dev server, so a production-only PWA plugin would pass it.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(tsx?|html)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

describe('v2 registers no service worker', () => {
  it('has no register call, PWA plugin or workbox dependency', () => {
    const files = [...sourceFiles('src'), 'index.html', 'vite.config.ts'];
    expect(files.filter((file) => /serviceWorker\s*\.\s*register|registerSW|VitePWA/.test(readFileSync(file, 'utf8')))).toEqual([]);
    const { dependencies = {}, devDependencies = {} } = JSON.parse(readFileSync('package.json', 'utf8')) as Record<string, Record<string, string>>;
    expect(Object.keys({ ...dependencies, ...devDependencies }).filter((name) => /pwa|workbox/i.test(name))).toEqual([]);
  });
});
