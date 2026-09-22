import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { autoSequence } from '../../domain/animation/sequence';
import { animEdge, animNode } from '../../domain/animation/testFixtures';
import type { AnimationPreset } from '../../domain/animation/types';
import { exportAnimatedSvg, exportMotionFrameSvg } from './animatedSvg';

// Animated-SVG goldens: one per preset over a real fixture. A change that
// moves keyframe timing, element grouping or the camera shows up as a diff.
const FIXTURE = '01-tiny-connection.dsl';

async function fixtureDocument(): Promise<SceneDocumentV1> {
  const compiled = await compile(readFileSync(join(process.cwd(), 'src/dsl/fixtures', FIXTURE), 'utf8'));
  return {
    format: 'openflowkit.scene', schemaVersion: 1, id: 'golden', name: 'animated',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{
      id: 'page-1', name: 'Page 1', diagramKind: compiled.meta.family,
      layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
      nodes: [compiled.frame, ...compiled.groups, ...compiled.nodes],
      connectors: compiled.connectors, metadata: {}, extensions: {},
    }],
    metadata: {}, extensions: {},
  } as SceneDocumentV1;
}

describe('animated SVG', () => {
  it('renders one golden per preset', async () => {
    const document = await fixtureDocument();
    for (const preset of ['build', 'walkthrough', 'pulse'] as const) {
      const timeline = autoSequence(document.pages[0]!, preset);
      expect(exportAnimatedSvg(document, timeline, { theme: 'light' })).toMatchSnapshot();
    }
  });

  it('keeps the finished diagram as the base and honours reduced motion', async () => {
    const document = await fixtureDocument();
    const svg = exportAnimatedSvg(document, autoSequence(document.pages[0]!, 'build'));
    expect(svg).toContain('@media (prefers-reduced-motion: reduce){.ofk-anim{animation:none!important}}');
    expect(svg).toContain('@keyframes ofk-node-');
    expect(svg).toContain('class="ofk-anim"');
    expect(svg).toContain('<style>');
    // The static base markup (no animation running) is the final frame.
    const frame = exportMotionFrameSvg(document, autoSequence(document.pages[0]!, 'build'), 10 ** 9);
    expect(frame).not.toContain('@keyframes');
    expect(frame).not.toContain('ofk-anim');
  });

  it('only walkthrough animates the camera', async () => {
    const document = await fixtureDocument();
    const page = document.pages[0]!;
    expect(exportAnimatedSvg(document, autoSequence(page, 'walkthrough'))).toContain('@keyframes ofk-camera');
    expect(exportAnimatedSvg(document, autoSequence(page, 'build'))).not.toContain('ofk-camera');
    expect(exportAnimatedSvg(document, autoSequence(page, 'pulse'))).not.toContain('ofk-camera');
  });

  it('rides an infinite travelling dash in pulse', async () => {
    const document = await fixtureDocument();
    const svg = exportAnimatedSvg(document, autoSequence(document.pages[0]!, 'pulse'));
    expect(svg).toContain('animation:ofk-pulse 1200ms linear');
    expect(svg).toContain('infinite none');
    expect(svg).toContain('stroke-dasharray="0.03 0.07"');
  });

  it('draws solid connectors on and leaves dashed ones to fade', async () => {
    const document = await fixtureDocument();
    const page = document.pages[0]!;
    const solid = autoSequence(page, 'build');
    expect(exportAnimatedSvg(document, solid)).toContain('stroke-dashoffset:1');
    const dashedPage = {
      ...page,
      connectors: page.connectors.map((connector) => ({
        ...connector,
        appearance: { ...connector.appearance, dashPattern: 'dashed' },
      })),
    };
    const dashed = autoSequence(dashedPage, 'build');
    const svg = exportAnimatedSvg({ ...document, pages: [dashedPage] }, dashed);
    expect(svg).not.toContain('-draw');
    expect(svg).toContain('stroke-dasharray="10 6"');
  });

  it('refuses an empty timeline', async () => {
    const document = await fixtureDocument();
    const empty = { steps: [], preset: 'build' as AnimationPreset, loop: false, durationMs: 0 };
    expect(() => exportAnimatedSvg(document, empty)).toThrow(TypeError);
  });

  it('keeps a 500-node build export within the size ceiling', async () => {
    const document = await fixtureDocument();
    const page = document.pages[0]!;
    const nodes = Array.from({ length: 500 }, (_, index) => ({
      ...animNode(`n${index}`, (index % 20) * 160, Math.floor(index / 20) * 90),
    }));
    const connectors = nodes.slice(1).map((node, index) => animEdge(`e${index}`, `n${index}`, node.id));
    const big = { ...document, pages: [{ ...page, nodes, connectors }] };
    const timeline = autoSequence(big.pages[0]!, 'build');
    const svg = exportAnimatedSvg(big, timeline);
    expect(timeline.steps).toHaveLength(500);
    // ~1 KB per element with keyframes; the spec ceiling is 40–80 KB for 8 nodes.
    expect(svg.length).toBeLessThan(1_200_000);
  });

  it('paints the paused frame state a still needs', async () => {
    const document = await fixtureDocument();
    const timeline = autoSequence(document.pages[0]!, 'build');
    const mid = exportMotionFrameSvg(document, timeline, 900);
    expect(mid).toContain('opacity:');
    expect(mid).toContain('transform-origin:0 0');
    expect(mid).toContain('transform:translate(60px,26px) scale(0.92)');
    expect(mid).toContain('stroke-dashoffset="');
  });
});
