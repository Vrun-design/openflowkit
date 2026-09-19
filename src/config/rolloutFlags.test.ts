import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLLOUT_FLAGS, ROLLOUT_FLAG_KEYS, getRolloutFlagDefinition } from './rolloutFlags';

describe('OpenCanvas rollout flags', () => {
  it('keeps the canonical document path disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasDocumentV1).toBe(false);
  });

  it('keeps the PixiJS renderer spike disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasRendererV1).toBe(false);
  });

  it('keeps canonical connector rendering disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasConnectorsV1).toBe(false);
  });

  it('keeps canonical node content layout disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasNodeLayoutV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasOrganizationV1).toBe(false);
  });

  it('keeps basic OpenCanvas node families disabled by default', () => {
    expect(ROLLOUT_FLAGS.openCanvasBasicNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasFreeformNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasArchitectureNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasContainerNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasClassEntityNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasMindmapJourneyNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasSequenceNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasWireframeNodesV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasA11yV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasCanonicalCollaboration).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasPersistedWorkspaceRepairV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasContextualCommandsV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasCustomShortcutsV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasNodeInsertionV1).toBe(false);
    expect(ROLLOUT_FLAGS.openCanvasEditorSurfaceV1).toBe(true);
  });
});

describe('rollout flag hygiene', () => {
  const SOURCE_ROOTS = ['src', 'benchmarks', 'scripts', 'e2e'];

  function sourceFiles(dir: string): string[] {
    const entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
    return entries.flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) return [];
      // The definition file and this test are not readers.
      if (full.includes('rolloutFlags')) return [];
      return [full];
    });
  }

  const corpus = SOURCE_ROOTS.flatMap(sourceFiles).map((file) => readFileSync(file, 'utf8'));

  it('has a reader for every declared flag', () => {
    // A flag may be read by key through ROLLOUT_FLAGS, or by env var directly
    // when it must be a compile-time literal so Vite can drop the code path.
    const orphans = ROLLOUT_FLAG_KEYS.filter((key) => {
      const envVar = getRolloutFlagDefinition(key).envVar;
      return !corpus.some((text) => text.includes(key) || (envVar && text.includes(envVar)));
    });

    expect(orphans, `unused rollout flags should be deleted, not left declared`).toEqual([]);
  });
});
