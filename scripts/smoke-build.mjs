import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexHtml = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

function fail(message) {
  console.error(`smoke-build failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fail('dist directory not found');
}

if (!fs.existsSync(indexHtml)) {
  fail('dist/index.html not found');
}

if (!fs.existsSync(assetsDir)) {
  fail('dist/assets directory not found');
}

const assets = fs.readdirSync(assetsDir);
if (assets.length === 0) {
  fail('dist/assets is empty');
}

console.log('smoke-build passed.');
