import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const HANDLE_POLICY_FILES = [
  'src/components/CustomNode.tsx',
  'src/components/ImageNode.tsx',
  'src/components/TextNode.tsx',
  'src/components/GroupNode.tsx',
  'src/components/SwimlaneNode.tsx',
  'src/components/custom-nodes/ArchitectureNode.tsx',
  'src/components/custom-nodes/BrowserNode.tsx',
  'src/components/custom-nodes/ClassNode.tsx',
  'src/components/custom-nodes/EntityNode.tsx',
  'src/components/custom-nodes/JourneyNode.tsx',
  'src/components/custom-nodes/MindmapNode.tsx',
  'src/components/custom-nodes/MobileNode.tsx',
] as const;

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('handle interaction usage guardrails', () => {
  it('keeps all node renderers on shared handle interaction helpers or NodeChrome wrapper', () => {
    for (const path of HANDLE_POLICY_FILES) {
      const source = readSource(path);
      const usesSharedHelpers = source.includes('getHandlePointerEvents') && source.includes('getV2HandleVisibilityClass');
      const usesNodeChrome = source.includes('NodeChrome');
      expect(usesSharedHelpers || usesNodeChrome, path).toBe(true);
    }
  });

  it('keeps flow-handle-hitarea literal only in shared helper', () => {
    const helperSource = readSource('src/components/handleInteraction.ts');
    expect(helperSource).toContain('flow-handle-hitarea');

    for (const path of HANDLE_POLICY_FILES) {
      const source = readSource(path);
      expect(source, path).not.toContain('flow-handle-hitarea');
    }
  });

  it('keeps handle pointer policy centralized and avoids hardcoded selected-pointer ternaries', () => {
    for (const path of HANDLE_POLICY_FILES) {
      const source = readSource(path);
      expect(source, path).not.toContain("selected && visualQualityV2Enabled ? 'none' : 'all'");
      expect(source, path).not.toContain('pointerEvents: selected && visualQualityV2Enabled');
    }
  });

  it('keeps handle fill color centralized instead of node-specific handle backgrounds', () => {
    for (const path of HANDLE_POLICY_FILES) {
      const source = readSource(path);
      expect(source, path).not.toContain('!bg-');
      expect(source, path).not.toContain('backgroundColor: lane.border');
      expect(source, path).not.toContain('backgroundColor: theme.border');
      expect(source, path).not.toContain('style.handle');
    }
  });
});
