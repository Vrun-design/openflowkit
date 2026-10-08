// Which files are not the system itself. Split from scan.ts so resolution can use it too.

// Same families as discovery.ts's NON_PRODUCTION_DIRS and rules.ts's SKIP_DIRS, widened with
// generated and vendored folders: facts about code nobody maintains would only crowd the map.
// No `build`/`out`/`target`/`tmp`: a git tree rarely holds gitignored output, so those names are mostly real
// source (src/build/). `dist` stays: repos commit bundles there (action/dist).
const SKIPPED_DIR = new Set([
  'node_modules', 'dist', 'coverage', 'venv', 'storybook-static', 'playwright-report', 'test-results',
  'test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'fixtures', '__fixtures__', 'testdata', '__mocks__', 'evals', 'testing',
  'generated', '__generated__', 'vendor', 'vendored', 'third_party', 'third-party',
]);
const SKIPPED_FILE = /\.(?:test|spec|integration|generated|gen|min)\.|\.d\.[cm]?ts$/;

/** Skipped: tests, specs, fixtures, mocks, generated, vendored or built output, `.d.ts`, and anything under a dot-folder. */
export function isSkippedSource(path: string): boolean {
  const segments = path.split('/');
  const name = segments.pop()!;
  return SKIPPED_FILE.test(name) || segments.some((segment) => SKIPPED_DIR.has(segment) || segment.startsWith('.'));
}
