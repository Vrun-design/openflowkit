import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { BROWSER_BENCHMARK_SCHEMA_VERSION, PERFORMANCE_BUDGETS } from './contracts';
import {
  installBrowserMetrics,
  readBrowserEnvironment,
  readBrowserMetrics,
  readHeapMb,
  resetBrowserMetrics,
} from './pageHarness';
import { summarizeSamples } from './statistics';

const RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks',
  'browser',
  'results',
  'pixi-spike.latest.json'
);
const FIXTURE_SIZES = [100, 300, 1_000] as const;

interface PixiSpikeApi {
  loadFixture(nodeCount: number): Promise<number>;
  resetCamera(): void;
  getNodeScreenBounds(
    nodeId: string
  ): { x: number; y: number; width: number; height: number } | null;
  getConnectorState(): { connectors: number; labels: number; markers: number };
  getNodeState(): readonly {
    id: string;
    kind: string;
    shape: string;
    fill: number;
    stroke: number;
    mediaState: 'none' | 'loading' | 'loaded' | 'missing';
    provider?: string;
    iconSource?: string;
    fillAlpha?: number;
    childCount?: number;
    parentId?: string | null;
    structuralState?: string;
    rowCount?: number;
    compartmentCount?: number;
    depth?: number;
    branchSide?: 'left' | 'right' | null;
    descendantCount?: number;
    journeySection?: string;
    journeyScore?: number | null;
    sequenceParticipantKind?: 'participant' | 'actor';
    sequenceAlias?: string | null;
    activationCount?: number;
    sequenceOrder?: number;
    sequenceTargetCount?: number;
    sequenceFragmentType?: string | null;
    sequenceFragmentId?: string;
    wireframeVariant?: string;
    wireframeSecure?: boolean;
    wireframeHasMedia?: boolean;
  }[];
  getConnectorEditState(): {
    connectorId: string | null;
    activeHandle: string | null;
    routeKind: string | null;
    ownership: string | null;
    waypointCount: number;
    waypoints: readonly { x: number; y: number }[];
    sourceNodeId: string | null;
    targetNodeId: string | null;
  };
  getConnectorHandles(): readonly ({
    kind: string;
    x: number;
    y: number;
  } & Record<string, unknown>)[];
  exportLegacyGraph(): {
    nodes: unknown[];
    edges: unknown[];
    name: string;
    diagramType: string;
  };
  getState(): {
    status: string;
    nodes: number;
    zoom: number;
    connectorModelEnabled: boolean;
    nodeLayoutModelEnabled: boolean;
    basicNodesEnabled: boolean;
    freeformNodesEnabled: boolean;
    architectureNodesEnabled: boolean;
    containerNodesEnabled: boolean;
    classEntityNodesEnabled: boolean;
    mindmapJourneyNodesEnabled: boolean;
    sequenceNodesEnabled: boolean;
    wireframeNodesEnabled: boolean;
  };
}

declare global {
  interface Window {
    __OPEN_CANVAS_PIXI_SPIKE__?: PixiSpikeApi;
  }
}

function getGitValue(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

async function openPixiSpike(page: Page): Promise<void> {
  await page.goto('/#/_labs/opencanvas-pixi');
  await expect(page.getByTestId('pixi-spike-viewport')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().status === 'ready',
    undefined,
    { timeout: 30_000 }
  );
}

test('captures the isolated PixiJS browser spike', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  await openPixiSpike(page);
  await installBrowserMetrics(page);
  const environment = await readBrowserEnvironment(page);
  const webGl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const debugInfo = context?.getExtension('WEBGL_debug_renderer_info');
    return {
      version: context ? (context instanceof WebGL2RenderingContext ? 2 : 1) : 0,
      vendor: debugInfo ? String(context?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : null,
      renderer: debugInfo ? String(context?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : null,
    };
  });
  const results = [];

  for (const nodeCount of FIXTURE_SIZES) {
    const heapBeforeMb = await readHeapMb(page);
    await resetBrowserMetrics(page);
    const loadMs = await page.evaluate(
      async (count) => (await window.__OPEN_CANVAS_PIXI_SPIKE__?.loadFixture(count)) ?? -1,
      nodeCount
    );
    const loadMetrics = await readBrowserMetrics(page);

    const viewport = page.getByTestId('pixi-spike-viewport');
    const box = await viewport.boundingBox();
    if (!box) throw new Error('Pixi spike viewport has no browser bounds.');
    const startX = box.x + box.width * 0.65;
    const startY = box.y + box.height * 0.55;
    await viewport.focus();
    await page.keyboard.press('h');
    await expect(page.getByLabel('Pan mode (H)')).toHaveAttribute('aria-pressed', 'true');
    await resetBrowserMetrics(page);
    const interactionStartedAt = await page.evaluate(() => performance.now());
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 180, startY + 90, { steps: 30 });
    await page.mouse.up();
    await page.mouse.wheel(0, -320);
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(250);
    const interactionEndedAt = await page.evaluate(() => performance.now());
    const metrics = await readBrowserMetrics(page);
    const heapAfterMb = await readHeapMb(page);

    results.push({
      nodeCount,
      connectorCount: nodeCount - 1,
      loadMs,
      loadFrameTimes: summarizeSamples(loadMetrics.frameTimesMs),
      loadFramesOver50Ms: loadMetrics.frameTimesMs.filter((sample) => sample > 50).length,
      interactionDurationMs: Number((interactionEndedAt - interactionStartedAt).toFixed(3)),
      frameTimes: summarizeSamples(metrics.frameTimesMs),
      inputNextFrame: summarizeSamples(metrics.inputNextFrameLatenciesMs),
      framesOver50Ms: metrics.frameTimesMs.filter((sample) => sample > 50).length,
      heapBeforeMb,
      heapAfterMb,
      heapDeltaMb:
        heapBeforeMb === null || heapAfterMb === null
          ? null
          : Number((heapAfterMb - heapBeforeMb).toFixed(3)),
      samples: metrics,
    });
  }

  const payload = {
    schemaVersion: BROWSER_BENCHMARK_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    renderer: 'pixi.js@8.18.1-webgl',
    appMode: 'production-preview',
    scenario: 'canonical-scene-load-then-pan-and-wheel',
    git: {
      commit: getGitValue(['rev-parse', 'HEAD']),
      branch: getGitValue(['branch', '--show-current']),
      dirty: getGitValue(['status', '--porcelain']).length > 0,
    },
    runner: {
      browserName,
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      ...environment,
      webGl,
    },
    budgets: PERFORMANCE_BUDGETS,
    results,
    notes: [
      'Results are machine-specific and must be compared on the same runner.',
      'Pixi uses an on-demand render loop; no ticker runs while the canvas is idle.',
      'This committed capture uses Playwright SwiftShader software WebGL for deterministic CI lifecycle coverage, not production GPU performance.',
      'rAF spacing measures frame pacing, not renderer CPU work. Inspect traces before accepting the 12ms renderer-work gate.',
    ],
  };

  fs.mkdirSync(path.dirname(RESULT_PATH), { recursive: true });
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  expect(results).toHaveLength(FIXTURE_SIZES.length);
  expect(results.every((result) => result.loadMs > 0)).toBe(true);
  expect(results.every((result) => result.frameTimes.count > 0)).toBe(true);
});

test('keeps native text editing aligned and survives WebGL context loss', async ({ page }) => {
  await openPixiSpike(page);
  const viewport = page.getByTestId('pixi-spike-viewport');
  const box = await viewport.boundingBox();
  if (!box) throw new Error('Pixi spike viewport has no browser bounds.');

  const firstNode = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  if (!firstNode) throw new Error('The first Pixi node has no screen bounds.');
  await page.mouse.dblclick(
    box.x + firstNode.x + firstNode.width / 2,
    box.y + firstNode.y + firstNode.height / 2
  );
  await expect(page.getByLabel('Edit selected node label')).toBeVisible();
  await page.keyboard.press('Escape');

  const canLoseContext = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.pixi-spike__canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 100);
    return true;
  });
  test.skip(!canLoseContext, 'WEBGL_lose_context is not exposed by this browser.');
  await expect(page.getByText(/context lost/i)).toBeVisible();
  await expect(page.getByText(/ready/i)).toBeVisible({ timeout: 10_000 });
});

test('supports keyboard modes, additive selection, and clear selection', async ({ page }) => {
  await openPixiSpike(page);
  const viewport = page.getByTestId('pixi-spike-viewport');
  const box = await viewport.boundingBox();
  const nodeBounds = await page.evaluate(() =>
    ['node-0', 'node-1'].map((id) => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds(id))
  );
  if (!box || !nodeBounds[0] || !nodeBounds[1])
    throw new Error('Selection fixture is unavailable.');

  await viewport.focus();
  await page.keyboard.press('h');
  await expect(page.getByLabel('Pan mode (H)')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('v');
  await expect(page.getByLabel('Select mode (V)')).toHaveAttribute('aria-pressed', 'true');

  await page.mouse.click(
    box.x + nodeBounds[0].x + nodeBounds[0].width / 2,
    box.y + nodeBounds[0].y + nodeBounds[0].height / 2
  );
  await page.keyboard.down('Shift');
  await page.mouse.click(
    box.x + nodeBounds[1].x + nodeBounds[1].width / 2,
    box.y + nodeBounds[1].y + nodeBounds[1].height / 2
  );
  await page.keyboard.up('Shift');
  await expect(page.getByText('2 selected')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Drag empty space to select')).toBeVisible();

  const marqueeStartX = box.x + Math.min(nodeBounds[0].x, nodeBounds[1].x) - 6;
  const marqueeStartY = box.y + Math.min(nodeBounds[0].y, nodeBounds[1].y) - 6;
  const marqueeEndX =
    box.x +
    Math.max(nodeBounds[0].x + nodeBounds[0].width, nodeBounds[1].x + nodeBounds[1].width) +
    6;
  const marqueeEndY =
    box.y +
    Math.max(nodeBounds[0].y + nodeBounds[0].height, nodeBounds[1].y + nodeBounds[1].height) +
    6;
  await page.mouse.move(marqueeStartX, marqueeStartY);
  await page.mouse.down();
  await page.mouse.move(marqueeEndX, marqueeEndY, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('2 selected')).toBeVisible();
});

test('moves, resizes, nudges, and undoes through canonical transform history', async ({ page }) => {
  await openPixiSpike(page);
  const viewport = page.getByTestId('pixi-spike-viewport');
  const viewportBox = await viewport.boundingBox();
  const initial = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  if (!viewportBox || !initial) throw new Error('Transform fixture is unavailable.');

  const center = {
    x: viewportBox.x + initial.x + initial.width / 2,
    y: viewportBox.y + initial.y + initial.height / 2,
  };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 48, center.y + 32, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByLabel(/Undo transform/)).toBeEnabled();
  const moved = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  expect(moved?.x).not.toBeCloseTo(initial.x);
  expect(moved?.y).not.toBeCloseTo(initial.y);

  await page.getByLabel(/Undo transform/).click();
  const restored = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  expect(restored?.x).toBeCloseTo(initial.x);
  expect(restored?.y).toBeCloseTo(initial.y);

  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  const nudged = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  expect(nudged?.x).toBeGreaterThan(initial.x);
  await page.keyboard.press('ControlOrMeta+z');

  const resizeStart = {
    x: viewportBox.x + initial.x + initial.width,
    y: viewportBox.y + initial.y + initial.height,
  };
  await page.mouse.move(resizeStart.x, resizeStart.y);
  await page.mouse.down();
  await page.mouse.move(resizeStart.x + 48, resizeStart.y + 32, { steps: 6 });
  await page.mouse.up();
  const resized = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  expect(resized?.width).toBeGreaterThan(initial.width);
  expect(resized?.height).toBeGreaterThan(initial.height);
});

test('edits node content layout with keyboard-accessible controls and history', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().nodeLayoutModelEnabled)
  ).toBe(true);
  const viewport = page.getByTestId('pixi-spike-viewport');
  const viewportBox = await viewport.boundingBox();
  const node = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-0')
  );
  if (!viewportBox || !node) throw new Error('Node layout fixture is unavailable.');
  await page.mouse.click(
    viewportBox.x + node.x + node.width / 2,
    viewportBox.y + node.y + node.height / 2
  );

  const layoutBar = page.getByLabel('Content layout for node-0');
  await expect(layoutBar).toBeVisible();
  await layoutBar.getByRole('button', { name: 'right' }).click();
  await expect(layoutBar.getByRole('button', { name: 'right' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.getByLabel(/Undo transform/).click();
  await expect(layoutBar.getByRole('button', { name: 'top' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  await layoutBar.getByRole('button', { name: 'free' }).click();
  const horizontalPosition = layoutBar.getByLabel('Free icon horizontal position');
  const positionBeforeNudge = Number(await horizontalPosition.inputValue());
  await horizontalPosition.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(async () => Number(await horizontalPosition.inputValue()))
    .toBeCloseTo(Math.min(1, positionBeforeNudge + 0.05));
});

test('renders basic node families with portable shape and color semantics', async ({ page }) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().basicNodesEnabled)
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(nodes?.slice(0, 5).map(({ kind, shape }) => ({ kind, shape }))).toEqual([
    { kind: 'process', shape: 'rounded' },
    { kind: 'start', shape: 'capsule' },
    { kind: 'decision', shape: 'diamond' },
    { kind: 'end', shape: 'capsule' },
    { kind: 'custom', shape: 'rounded' },
  ]);
  expect(new Set(nodes?.slice(0, 5).map((node) => node.stroke)).size).toBe(4);
});

test('renders text, image, and annotation families with portable content semantics', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().freeformNodesEnabled)
  ).toBe(true);
  await expect
    .poll(async () => {
      const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
      return nodes?.find((node) => node.kind === 'image')?.mediaState;
    })
    .toBe('loaded');
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(
    nodes?.slice(5, 8).map(({ kind, shape, mediaState }) => ({ kind, shape, mediaState }))
  ).toEqual([
    { kind: 'text', shape: 'text', mediaState: 'none' },
    { kind: 'image', shape: 'image', mediaState: 'loaded' },
    { kind: 'annotation', shape: 'annotation', mediaState: 'none' },
  ]);
});

test('renders architecture cards and provider icon nodes with real catalog artwork', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(
      () => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().architectureNodesEnabled
    )
  ).toBe(true);
  await expect
    .poll(async () => {
      const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
      return nodes?.slice(8, 10).map((node) => node.mediaState);
    })
    .toEqual(['loaded', 'loaded']);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(
    nodes?.slice(8, 10).map(({ kind, shape, mediaState, provider, iconSource }) => ({
      kind,
      shape,
      mediaState,
      provider,
      iconSource,
    }))
  ).toEqual([
    {
      kind: 'architecture',
      shape: 'architecture-card',
      mediaState: 'loaded',
      provider: 'aws',
      iconSource: 'provider',
    },
    {
      kind: 'provider-icon',
      shape: 'provider-icon',
      mediaState: 'loaded',
      provider: 'developer',
      iconSource: 'provider',
    },
  ]);
});

test('renders structural containers behind nested content with canonical parent transforms', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().containerNodesEnabled)
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(
    nodes?.slice(10, 13).map(({ kind, shape, childCount, parentId, structuralState }) => ({
      kind,
      shape,
      childCount,
      parentId,
      structuralState,
    }))
  ).toEqual([
    {
      kind: 'group',
      shape: 'group-frame',
      childCount: 1,
      parentId: null,
      structuralState: 'expanded',
    },
    {
      kind: 'section',
      shape: 'section-frame',
      childCount: 1,
      parentId: null,
      structuralState: 'Locked',
    },
    {
      kind: 'swimlane',
      shape: 'swimlane',
      childCount: 1,
      parentId: null,
      structuralState: 'expanded',
    },
  ]);
  const bounds = await page.evaluate(() => ({
    group: window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-10'),
    child: window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-13'),
  }));
  expect(bounds.group).not.toBeNull();
  expect(bounds.child).not.toBeNull();
  expect(bounds.child!.x).toBeGreaterThan(bounds.group!.x);
  expect(bounds.child!.y).toBeGreaterThan(bounds.group!.y);
  expect(bounds.child!.x + bounds.child!.width).toBeLessThan(bounds.group!.x + bounds.group!.width);
  expect(bounds.child!.y + bounds.child!.height).toBeLessThan(
    bounds.group!.y + bounds.group!.height
  );
});

test('renders class and ER nodes with portable compartments and row semantics', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().classEntityNodesEnabled)
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(
    nodes?.slice(16, 18).map(({ kind, shape, rowCount, compartmentCount }) => ({
      kind,
      shape,
      rowCount,
      compartmentCount,
    }))
  ).toEqual([
    { kind: 'class', shape: 'class-compartments', rowCount: 5, compartmentCount: 3 },
    { kind: 'er_entity', shape: 'entity-table', rowCount: 3, compartmentCount: 2 },
  ]);
});

test('renders mindmap hierarchy and journey scores with portable semantics', async ({ page }) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(
      () => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().mindmapJourneyNodesEnabled
    )
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(
    nodes
      ?.slice(18, 22)
      .map(
        ({
          kind,
          shape,
          depth,
          parentId,
          branchSide,
          structuralState,
          childCount,
          descendantCount,
        }) => ({
          kind,
          shape,
          depth,
          parentId,
          branchSide,
          structuralState,
          childCount,
          descendantCount,
        })
      )
  ).toEqual([
    {
      kind: 'mindmap',
      shape: 'double-circle',
      depth: 0,
      parentId: null,
      branchSide: null,
      structuralState: 'expanded',
      childCount: 2,
      descendantCount: 3,
    },
    {
      kind: 'mindmap',
      shape: 'double-square',
      depth: 1,
      parentId: 'node-18',
      branchSide: 'left',
      structuralState: 'expanded',
      childCount: 0,
      descendantCount: 0,
    },
    {
      kind: 'mindmap',
      shape: 'hexagon',
      depth: 1,
      parentId: 'node-18',
      branchSide: 'right',
      structuralState: 'collapsed',
      childCount: 1,
      descendantCount: 1,
    },
    {
      kind: 'mindmap',
      shape: 'subroutine',
      depth: 2,
      parentId: 'node-20',
      branchSide: 'right',
      structuralState: 'expanded',
      childCount: 0,
      descendantCount: 0,
    },
  ]);
  expect(nodes?.[22]).toMatchObject({
    kind: 'journey',
    shape: 'journey-step',
    journeySection: 'Payment',
    journeyScore: 2,
  });
});

test('renders sequence lifelines, activations, notes, and fragments with portable semantics', async ({
  page,
}) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().sequenceNodesEnabled)
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(nodes?.slice(23, 28)).toMatchObject([
    {
      kind: 'sequence_participant',
      shape: 'actor-lifeline',
      sequenceParticipantKind: 'actor',
      sequenceAlias: 'buyer',
      activationCount: 1,
    },
    {
      kind: 'sequence_participant',
      shape: 'participant-lifeline',
      sequenceParticipantKind: 'participant',
      sequenceAlias: 'api',
      activationCount: 1,
    },
    {
      kind: 'sequence_note',
      shape: 'sequence-note',
      sequenceOrder: 2,
      sequenceTargetCount: 2,
      sequenceFragmentType: 'alt',
    },
    {
      kind: 'sequence_fragment',
      shape: 'sequence-fragment',
      sequenceOrder: 2,
      sequenceFragmentId: 'fragment-payment',
    },
    {
      kind: 'sequence_participant',
      shape: 'participant-lifeline',
      sequenceParticipantKind: 'participant',
      sequenceAlias: 'worker',
      activationCount: 1,
    },
  ]);
});

test('renders browser and mobile wireframes with portable frame semantics', async ({ page }) => {
  await openPixiSpike(page);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().wireframeNodesEnabled)
  ).toBe(true);
  const nodes = await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeState());
  expect(nodes?.slice(28, 30)).toMatchObject([
    {
      kind: 'browser',
      shape: 'browser-frame',
      wireframeVariant: 'dashboard',
      wireframeSecure: true,
      wireframeHasMedia: false,
    },
    {
      kind: 'mobile',
      shape: 'mobile-frame',
      wireframeVariant: 'chat',
      wireframeHasMedia: false,
    },
  ]);
});

test('renders canonical connector routes, labels, and semantic markers', async ({ page }) => {
  await openPixiSpike(page);
  await expect(page.getByText(/canonical connectors/i)).toBeVisible();
  const state = await page.evaluate(() => ({
    renderer: window.__OPEN_CANVAS_PIXI_SPIKE__?.getState(),
    connectors: window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorState(),
  }));
  expect(state.renderer?.connectorModelEnabled).toBe(true);
  expect(state.connectors).toEqual({ connectors: 299, labels: 10, markers: 303 });
});

test('edits connector anatomy with keyboard, pointer, history, and reset controls', async ({
  page,
}) => {
  await openPixiSpike(page);
  const viewport = page.getByTestId('pixi-spike-viewport');
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error('Connector edit fixture is unavailable.');

  await viewport.focus();
  await page.keyboard.press('e');
  await expect(page.getByLabel('Edit connector-0')).toBeVisible();
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState())
  ).toMatchObject({
    connectorId: 'connector-0',
    routeKind: 'direct',
    ownership: 'automatic',
    waypointCount: 0,
  });

  await page.getByRole('button', { name: 'Add bend' }).click();
  const added = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState()
  );
  expect(added).toMatchObject({ routeKind: 'polyline', ownership: 'manual', waypointCount: 1 });
  const originalWaypointY = added?.waypoints[0].y ?? 0;

  await viewport.focus();
  await page.keyboard.press('ArrowDown');
  const nudged = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState()
  );
  expect(nudged?.waypoints[0].y).toBe(originalWaypointY + 1);
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState())
  ).toMatchObject({ routeKind: 'direct', ownership: 'automatic', waypointCount: 0 });

  const targetHandle = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__
      ?.getConnectorHandles()
      .find((handle) => handle.kind === 'endpoint' && handle.role === 'target')
  );
  const nodeTwo = await page.evaluate(() =>
    window.__OPEN_CANVAS_PIXI_SPIKE__?.getNodeScreenBounds('node-2')
  );
  if (!targetHandle || !nodeTwo) throw new Error('Connector endpoint fixture is unavailable.');
  await page.mouse.move(viewportBox.x + targetHandle.x, viewportBox.y + targetHandle.y);
  await page.mouse.down();
  await page.mouse.move(
    viewportBox.x + nodeTwo.x + nodeTwo.width / 2,
    viewportBox.y + nodeTwo.y + nodeTwo.height / 2,
    { steps: 8 }
  );
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState())
  ).toMatchObject({ targetNodeId: 'node-2', ownership: 'automatic', waypointCount: 0 });

  await page.getByRole('button', { name: 'Reset route' }).click();
  await page.keyboard.press('ControlOrMeta+z');
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState())
  ).toMatchObject({ targetNodeId: 'node-1' });
});

test('keeps a 1,500-edge edit inside the browser lifecycle failure budget', async ({ page }) => {
  test.setTimeout(60_000);
  await openPixiSpike(page);
  const loadMs = await page.evaluate(
    async () => (await window.__OPEN_CANVAS_PIXI_SPIKE__?.loadFixture(1_501)) ?? -1
  );
  expect(loadMs).toBeGreaterThan(0);
  expect(loadMs).toBeLessThan(PERFORMANCE_BUDGETS.largeInitialInteractiveFailureMs);
  expect(
    await page.evaluate(() => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorState())
  ).toMatchObject({ connectors: 1_500 });

  const viewport = page.getByTestId('pixi-spike-viewport');
  await viewport.focus();
  await page.keyboard.press('e');
  const startedAt = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name: 'Add bend' }).click();
  await page.waitForFunction(
    () => window.__OPEN_CANVAS_PIXI_SPIKE__?.getConnectorEditState().waypointCount === 1
  );
  const editMs = await page.evaluate((start) => performance.now() - start, startedAt);
  expect(editMs).toBeLessThan(PERFORMANCE_BUDGETS.largeInitialInteractiveFailureMs);
});
