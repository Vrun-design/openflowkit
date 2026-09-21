// Builds dist from a clean slate. `tsc` alone cannot ship the agent bundle:
// src/generated/ is produced by Vite and never type-checked into dist, and a
// plain tsc run leaves stale modules from previous builds behind. So: wipe,
// compile, then copy the bundle to where dist/lib/agent.js imports it.
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const GENERATED = resolve(ROOT, 'src', 'generated');
const DIST_GENERATED = resolve(ROOT, 'dist', 'generated');

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function main() {
  await rm(resolve(ROOT, 'dist'), { recursive: true, force: true });
  await run('npx', ['tsc', '-p', 'tsconfig.json']);
  await mkdir(DIST_GENERATED, { recursive: true });
  await cp(GENERATED, DIST_GENERATED, { recursive: true });
  console.log('[build] dist ready (agent bundle copied to dist/generated)');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
