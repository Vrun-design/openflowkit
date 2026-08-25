import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOpenCanvasReleaseReport,
  collectDependencyClosure,
  extractOpenCanvasFlags,
} from './opencanvas-release-report.mjs';

test('collects a deterministic dependency closure', () => {
  const lock = { packages: {
    'node_modules/pixi.js': { version: '1.0.0', license: 'MIT', dependencies: { child: '^1' } },
    'node_modules/child': { version: '1.2.0', license: 'ISC' },
  } };
  assert.deepEqual(collectDependencyClosure(lock), [
    { name: 'child', version: '1.2.0', license: 'ISC', path: 'node_modules/child' },
    { name: 'pixi.js', version: '1.0.0', license: 'MIT', path: 'node_modules/pixi.js' },
  ]);
});

test('extracts OpenCanvas flag defaults', () => {
  assert.deepEqual(extractOpenCanvasFlags(`
    openCanvasRendererV1: {
      envVar: 'VITE_OPEN_CANVAS_RENDERER_V1',
      defaultEnabled: false,
    },
  `), [{
    key: 'openCanvasRendererV1',
    envVar: 'VITE_OPEN_CANVAS_RENDERER_V1',
    defaultEnabled: false,
  }]);
});

test('passes the repository capability and Pixi dependency/license report', () => {
  const report = buildOpenCanvasReleaseReport();
  assert.equal(report.status, 'pass', report.errors.join('\n'));
  assert.ok(report.rolloutFlags.length >= 10);
  assert.ok(report.dependencies.some((dependency) => (
    dependency.name === 'pixi.js' && dependency.version === '8.18.1' && dependency.license === 'MIT'
  )));
});
