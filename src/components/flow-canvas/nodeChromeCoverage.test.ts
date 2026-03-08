import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const NODE_COMPONENT_FILES = [
  'src/components/CustomNode.tsx',
  'src/components/AnnotationNode.tsx',
  'src/components/SectionNode.tsx',
  'src/components/TextNode.tsx',
  'src/components/GroupNode.tsx',
  'src/components/SwimlaneNode.tsx',
  'src/components/ImageNode.tsx',
  'src/components/custom-nodes/BrowserNode.tsx',
  'src/components/custom-nodes/MobileNode.tsx',
  'src/components/custom-nodes/ClassNode.tsx',
  'src/components/custom-nodes/EntityNode.tsx',
  'src/components/custom-nodes/MindmapNode.tsx',
  'src/components/custom-nodes/JourneyNode.tsx',
  'src/components/custom-nodes/ArchitectureNode.tsx',
] as const;

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

describe('node chrome coverage', () => {
  it('ensures each supported node component uses NodeChrome or explicit transform controls and 4-side handles', () => {
    for (const path of NODE_COMPONENT_FILES) {
      const source = readSource(path);
      const usesNodeChrome = source.includes('NodeChrome');
      const usesExplicitChrome =
        source.includes('NodeTransformControls')
        && source.includes('<Handle')
        && source.includes('Position.Top')
        && source.includes('Position.Right')
        && source.includes('Position.Bottom')
        && source.includes('Position.Left');
      expect(usesNodeChrome || usesExplicitChrome, path).toBe(true);
    }
  });

  it('keeps production node components on NodeChrome or loose-mode universal handles', () => {
    for (const path of NODE_COMPONENT_FILES) {
      const source = readSource(path);
      if (source.includes('NodeChrome')) {
        expect(source, path).toContain('NodeChrome');
        continue;
      }

      expect(source, path).toContain('type="source"');
      expect(source, path).not.toContain('type="target"');
    }
  });

  it('keeps selection chrome centralized instead of adding node-local selected rings', () => {
    const forbiddenPatterns = [
      /selected\s*\?\s*['"`][^'"`]*ring-/,
      /selected\s*&&\s*!visualQualityV2Enabled[^\n]*ring-/,
      /boxShadow:\s*selected\s*&&\s*visualQualityV2Enabled/,
    ];

    for (const path of NODE_COMPONENT_FILES) {
      const source = readSource(path);
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(source), `${path} matches ${pattern}`).toBe(false);
      }
    }
  });
});
