// The tests need the map viewer bundle, which takes seconds to build: build it only when it is missing.
// A changed viewer is rebuilt with `npm run build:map-viewer` (the `build` script always does).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(resolve(ROOT, 'src', 'generated-viewer', 'map-viewer.js'))) {
  const result = spawnSync('npm', ['run', 'build:map-viewer'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(result.status ?? 1);
}
