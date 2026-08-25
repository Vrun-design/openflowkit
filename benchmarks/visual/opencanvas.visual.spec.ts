import { expect, test, type Page } from '@playwright/test';
import { OPEN_CANVAS_RENDER_WORK_MEASURE } from '../../src/opencanvas/application/renderer/renderWorkMeasurement';

interface VisualFixtureGraph {
  nodes: unknown[];
  edges: unknown[];
  name: string;
  diagramType: string;
}

const FAMILY_CORPUS = [
  { name: 'basic', nodeIds: ['node-0', 'node-1', 'node-2', 'node-3', 'node-4'] },
  { name: 'freeform', nodeIds: ['node-5', 'node-6', 'node-7'] },
  { name: 'architecture', nodeIds: ['node-8', 'node-9'] },
  {
    name: 'containers',
    nodeIds: ['node-10', 'node-11', 'node-12', 'node-13', 'node-14', 'node-15'],
  },
  { name: 'class-er', nodeIds: ['node-16', 'node-17'] },
  {
    name: 'mindmap-journey',
    nodeIds: ['node-18', 'node-19', 'node-20', 'node-21', 'node-22'],
  },
  {
    name: 'sequence',
    nodeIds: ['node-23', 'node-24', 'node-25', 'node-26', 'node-27'],
  },
  { name: 'wireframe', nodeIds: ['node-28', 'node-29'] },
] as const;

declare global {
  interface Window {
    __OPEN_CANVAS_PIXI_SPIKE__?: {
      loadFixture(nodeCount: number): Promise<number>;
      exportLegacyGraph(): VisualFixtureGraph;
      getState(): { status: string };
    };
  }
}

async function waitForStablePaint(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    }));
  });
  await page.waitForTimeout(1_500);
}

async function createMixedFamilyFixture(page: Page): Promise<VisualFixtureGraph> {
  await page.goto('/#/_labs/opencanvas-pixi');
  await expect(page.getByTestId('pixi-spike-viewport')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => window.__OPEN_CANVAS_PIXI_SPIKE__?.getState().status === 'ready',
    undefined,
    { timeout: 30_000 }
  );
  return page.evaluate(() => {
    const graph = window.__OPEN_CANVAS_PIXI_SPIKE__?.exportLegacyGraph();
    if (!graph) throw new Error('OpenCanvas visual fixture export is unavailable.');
    const nodeIds = new Set(
      graph.nodes.slice(0, 30).map((node) => (node as { id: string }).id)
    );
    return {
      ...graph,
      nodes: graph.nodes.slice(0, 30),
      edges: graph.edges.filter((edge) => {
        const record = edge as { source: string; target: string };
        return nodeIds.has(record.source) && nodeIds.has(record.target);
      }),
    };
  });
}

function selectFamily(
  graph: VisualFixtureGraph,
  family: (typeof FAMILY_CORPUS)[number]
): VisualFixtureGraph {
  const ids = new Set<string>(family.nodeIds);
  const nodes = graph.nodes.filter((node) => ids.has((node as { id: string }).id));
  const edges = graph.edges.filter((edge) => {
    const record = edge as { source: string; target: string };
    return ids.has(record.source) && ids.has(record.target);
  });
  return { ...graph, name: `${graph.name}: ${family.name}`, nodes, edges };
}

async function importIntoProductionEditor(page: Page, graph: VisualFixtureGraph): Promise<void> {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = await headerCreate.isVisible()
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.locator('#json-import-input').setInputFiles({
    name: 'opencanvas-mixed-family-golden.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: '1.1',
      name: graph.name,
      diagramType: graph.diagramType,
      nodes: graph.nodes,
      edges: graph.edges,
    })),
  });
  await expect(page.locator('.react-flow__node')).toHaveCount(graph.nodes.length, {
    timeout: 30_000,
  });
  await waitForStablePaint(page);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hasSeenWelcome_v1', 'true');
  });
});

test('imports canonical scene JSON through the production file boundary', async ({ page }) => {
  await page.goto('/#/home');
  const headerCreate = page.getByTestId('home-create-new-header');
  const createButton = await headerCreate.isVisible()
    ? headerCreate
    : page.getByTestId('home-create-new-main');
  await createButton.click();
  await expect(page).toHaveURL(/#\/flow\/[^?]+/);
  await page.locator('#json-import-input').setInputFiles({
    name: 'canonical-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'openflowkit.scene',
      schemaVersion: 1,
      id: 'canonical-browser-document',
      name: 'Canonical browser import',
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T00:00:00.000Z',
      pages: [{
        id: 'page-1', name: 'Page 1', diagramKind: 'flowchart',
        layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
        nodes: [{
          id: 'canonical-import-node', kind: 'process', parentId: null,
          layerId: 'default', zIndex: 0,
          transform: {
            translation: { x: 120, y: 80 }, rotationRadians: 0, scale: { x: 1, y: 1 },
          },
          size: { width: 180, height: 80 },
          content: { label: 'Canonical import proof' }, appearance: {}, ports: [],
          metadata: {}, extensions: {},
        }],
        connectors: [], metadata: {}, extensions: {},
      }],
      metadata: {}, extensions: {},
    })),
  });

  const imported = page.locator('.react-flow__node[data-id="canonical-import-node"]');
  await expect(imported).toContainText('Canonical import proof', { timeout: 30_000 });
  await expect(page.getByText('Canonical diagram loaded successfully!')).toBeVisible();
});

test('keeps mixed-family React Flow and OpenCanvas visual goldens', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);

  for (const family of FAMILY_CORPUS) {
    await importIntoProductionEditor(page, selectFamily(graph, family));
    await expect(page.locator('.react-flow')).toHaveScreenshot(`${family.name}-reactflow.png`);

    const currentUrl = new URL(page.url());
    const hash = currentUrl.hash;
    const separator = hash.includes('?') ? '&' : '?';
    await page.goto(
      `${currentUrl.origin}${currentUrl.pathname}${hash}${separator}renderer=opencanvas`
    );
    const viewport = page.getByTestId('opencanvas-document-viewport');
    await expect(viewport).toBeVisible({ timeout: 30_000 });
    await expect(viewport.locator('canvas')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/OpenCanvas canary/)).toBeVisible();
    await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
    await waitForStablePaint(page);

    await expect(viewport).toHaveScreenshot(`${family.name}-opencanvas.png`);
  }
});

test('persists an accessible canonical keyboard transform back to React Flow', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));
  const reactFlowNode = page.locator('.react-flow__node[data-id="node-0"]');
  const beforeStyle = await reactFlowNode.getAttribute('style');

  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  const semanticNode = page.getByRole('button', { name: 'Select Service 1' });
  await semanticNode.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+ArrowRight');
  const useReactFlow = page.getByRole('link', { name: 'Use React Flow' });
  if (await useReactFlow.isVisible()) await useReactFlow.click();

  await expect(reactFlowNode).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => reactFlowNode.getAttribute('style')).not.toBe(beforeStyle);
});

test('commits inline DOM text editing through canonical history and fallback', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  const semanticNode = page.getByRole('button', { name: 'Select Service 1' });
  await semanticNode.focus();
  await page.keyboard.press('Enter');
  await semanticNode.press('F2');
  const editor = page.getByRole('textbox', { name: 'Edit node label' });
  await expect(editor).toBeFocused();
  await editor.fill('Inline renamed service');
  await editor.press('Enter');
  await expect(editor).toBeHidden();
  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__node[data-id="node-0"]'))
    .toContainText('Inline renamed service');
});

test('cancels a captured drawing gesture without document mutation', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  const fixture = selectFamily(graph, FAMILY_CORPUS[0]);
  await importIntoProductionEditor(page, fixture);
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await page.getByRole('button', { name: 'Draw pen', exact: true }).click();
  const viewport = page.getByTestId('opencanvas-document-viewport');
  const bounds = await viewport.boundingBox();
  if (!bounds) throw new Error('OpenCanvas viewport bounds unavailable.');
  await page.mouse.move(bounds.x + 320, bounds.y + 240);
  await page.mouse.wheel(0, -320);
  await expect.poll(async () => Number(
    await viewport.getAttribute('data-camera-zoom')
  )).toBeGreaterThan(1.2);
  const zoomedView = await viewport.getAttribute('data-camera-zoom');
  expect(zoomedView).not.toBe('1.0000');
  await page.getByRole('button', { name: '100%' }).click();
  await expect(viewport).toHaveAttribute('data-camera-zoom', '1.0000');
  await page.getByRole('button', { name: 'Previous view' }).click();
  await expect(viewport).toHaveAttribute('data-camera-zoom', zoomedView!);
  const beforeTrackpadX = await viewport.getAttribute('data-camera-x');
  await viewport.dispatchEvent('wheel', {
    deltaX: 8, deltaY: 12, deltaMode: 0, ctrlKey: false, shiftKey: false,
    clientX: 320, clientY: 240,
  });
  await expect.poll(() => viewport.getAttribute('data-camera-x')).not.toBe(beforeTrackpadX);
  await expect(viewport).toHaveAttribute('data-camera-zoom', zoomedView!);
  await viewport.dispatchEvent('wheel', {
    deltaX: 0, deltaY: -12, deltaMode: 0, ctrlKey: true, shiftKey: false,
    clientX: 320, clientY: 240,
  });
  await expect.poll(() => viewport.getAttribute('data-camera-zoom')).not.toBe(zoomedView);
  const beforeSpacePanX = await viewport.getAttribute('data-camera-x');
  await viewport.focus();
  await page.keyboard.down('Space');
  await page.mouse.move(bounds.x + 220, bounds.y + 200);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 300, bounds.y + 205, { steps: 2 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  await expect.poll(() => viewport.getAttribute('data-camera-x')).not.toBe(beforeSpacePanX);
  const releasedPanX = await viewport.getAttribute('data-camera-x');
  await expect.poll(() => viewport.getAttribute('data-camera-x')).not.toBe(releasedPanX);
  await page.keyboard.press('Escape');
  const beforeTouchZoom = await viewport.getAttribute('data-camera-zoom');
  await viewport.dispatchEvent('pointerdown', {
    pointerId: 81, pointerType: 'touch', button: 0,
    clientX: bounds.x + 180, clientY: bounds.y + 180,
  });
  await viewport.dispatchEvent('pointerdown', {
    pointerId: 82, pointerType: 'touch', button: 0,
    clientX: bounds.x + 280, clientY: bounds.y + 180,
  });
  await viewport.dispatchEvent('pointermove', {
    pointerId: 82, pointerType: 'touch', button: 0,
    clientX: bounds.x + 360, clientY: bounds.y + 180,
  });
  await expect.poll(() => viewport.getAttribute('data-camera-zoom')).not.toBe(beforeTouchZoom);
  await viewport.dispatchEvent('pointerup', {
    pointerId: 82, pointerType: 'touch', button: 0,
    clientX: bounds.x + 360, clientY: bounds.y + 180,
  });
  const beforeTouchHandoffX = await viewport.getAttribute('data-camera-x');
  await viewport.dispatchEvent('pointermove', {
    pointerId: 81, pointerType: 'touch', button: 0,
    clientX: bounds.x + 210, clientY: bounds.y + 180,
  });
  await expect.poll(() => viewport.getAttribute('data-camera-x')).not.toBe(beforeTouchHandoffX);
  await viewport.dispatchEvent('pointerup', {
    pointerId: 81, pointerType: 'touch', button: 0,
    clientX: bounds.x + 210, clientY: bounds.y + 180,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Draw pen', exact: true }).click();
  await page.getByRole('button', { name: 'Select Service 1' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole('button', { name: 'Fit selection' }).click();
  await page.waitForTimeout(250);
  const beforeEdgeScrollX = await viewport.getAttribute('data-camera-x');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height / 2);
  await expect.poll(() => viewport.getAttribute('data-camera-x')).not.toBe(beforeEdgeScrollX);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.getByRole('button', { name: 'Draw pen', exact: true }).click();
  await page.mouse.move(bounds.x + 180, bounds.y + 180);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 260, bounds.y + 230, { steps: 4 });
  const beforeFreeformEdgeScrollX = await viewport.getAttribute('data-camera-x');
  await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height / 2);
  await expect.poll(() => viewport.getAttribute('data-camera-x'))
    .not.toBe(beforeFreeformEdgeScrollX);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByText('Gesture canceled. Document unchanged.')).toBeAttached();
  await page.getByRole('button', { name: 'Draw pen', exact: true }).click();
  const beforeMarqueeEdgeScrollX = await viewport.getAttribute('data-camera-x');
  await page.mouse.move(bounds.x + 8, bounds.y + 8);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 4, bounds.y + bounds.height - 4);
  await expect.poll(() => viewport.getAttribute('data-camera-x'))
    .not.toBe(beforeMarqueeEdgeScrollX);
  await page.mouse.up();
  await expect(page.getByText(/\d+ nodes? selected\./)).toBeAttached();
  const rendererWorkSamples = await page.evaluate(
    (measureName) => performance.getEntriesByName(measureName).map((entry) => entry.duration),
    OPEN_CANVAS_RENDER_WORK_MEASURE
  );
  expect(rendererWorkSamples.length).toBeGreaterThan(0);
  expect(rendererWorkSamples.every((duration) => Number.isFinite(duration) && duration >= 0))
    .toBe(true);
  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(fixture.nodes.length);
});

test('persists an accessible canonical connector edit back to React Flow', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));
  const edgePath = page.locator('.react-flow__edge[data-id="connector-1"] .react-flow__edge-path');
  const beforePath = await edgePath.getAttribute('d');

  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const resetRoute = page.getByRole('button', { name: 'Reset route for connector Failure' });
  await resetRoute.focus();
  await page.keyboard.press('Enter');
  const label = page.getByRole('textbox', { name: 'Label for connector Failure' });
  await label.fill('Recovered');
  await label.press('Enter');
  await page.getByRole('link', { name: 'Use React Flow' }).click();

  await expect(edgePath).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => edgePath.getAttribute('d')).not.toBe(beforePath);
  await expect(page.getByText('Recovered', { exact: true })).toBeVisible();
});

test('persists canonical node rename, duplicate, create, and delete operations', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));

  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'OpenCanvas inspector' })).toBeVisible();
  await expect(page.getByRole('img', { name: /thumbnail with \d+ objects/ }).first()).toBeVisible();
  const canonicalDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export canonical JSON' }).click();
  const canonicalDownload = await canonicalDownloadPromise;
  expect(canonicalDownload.suggestedFilename()).toMatch(/\.json$/);
  const canonicalStream = await canonicalDownload.createReadStream();
  let canonicalJson = '';
  for await (const chunk of canonicalStream) canonicalJson += chunk.toString();
  const canonicalDocument = JSON.parse(canonicalJson) as {
    format: string; schemaVersion: number; pages: unknown[];
  };
  expect(canonicalDocument).toMatchObject({
    format: 'openflowkit.scene', schemaVersion: 1,
  });
  expect(canonicalDocument.pages).toHaveLength(1);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' })
    .evaluate((button: HTMLButtonElement) => button.click());
  const svgDownload = await downloadPromise;
  expect(svgDownload.suggestedFilename()).toMatch(/\.svg$/);
  const svgStream = await svgDownload.createReadStream();
  let svgExport = '';
  for await (const chunk of svgStream) svgExport += chunk.toString();
  expect(svgExport).toContain('data-openflowkit-document=');
  expect(svgExport).toContain('data-node-id=');
  await page.getByRole('button', { name: 'Render diagnostics' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByLabel('OpenCanvas render diagnostics')).toContainText('idle-on-demand');
  await page.getByRole('button', { name: 'Layout page' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled({ timeout: 30_000 });

  const label = page.getByRole('textbox', { name: 'Label for Service 1' });
  await label.fill('Renamed in OpenCanvas');
  await label.press('Enter');

  const duplicate = page.getByRole('button', { name: 'Duplicate Renamed in OpenCanvas' });
  await duplicate.focus();
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Add process node' }).click();

  const remove = page.getByRole('button', { name: 'Delete Service 2' });
  await remove.focus();
  await page.keyboard.press('Enter');

  const renamedItem = page.locator('li').filter({
    has: page.getByRole('textbox', { name: 'Label for Renamed in OpenCanvas' }),
  }).first();
  await renamedItem.getByRole('button', { name: 'Copy Renamed in OpenCanvas' })
    .evaluate((button: HTMLButtonElement) => button.click());
  const pasteRenamed = renamedItem.getByRole('button', { name: 'Paste after Renamed in OpenCanvas' });
  await expect(pasteRenamed).toBeEnabled();
  await pasteRenamed.evaluate((button: HTMLButtonElement) => button.click());
  const symbolItem = page.locator('li').filter({
    has: page.getByRole('textbox', { name: 'Label for Renamed in OpenCanvas' }),
  }).first();
  await symbolItem.getByRole('button', { name: 'Make Renamed in OpenCanvas a symbol' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await symbolItem.getByRole('button', { name: 'Create instance of Renamed in OpenCanvas' })
    .evaluate((button: HTMLButtonElement) => button.click());
  const definitionProperties = symbolItem.locator('form[aria-label="Properties for Renamed in OpenCanvas"]');
  await definitionProperties.locator('input[name="subLabel"]').fill('Linked symbol subtitle');
  await definitionProperties.getByRole('button', { name: 'Update properties for Renamed in OpenCanvas' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole('button', { name: 'Close inspector' })
    .evaluate((button: HTMLButtonElement) => button.click());
  for (const primitive of ['pen', 'highlighter', 'line', 'arrow', 'sticky', 'callout']) {
    await page.getByRole('button', { name: `Add ${primitive}`, exact: true })
      .evaluate((button: HTMLButtonElement) => button.click());
  }
  await page.getByRole('button', { name: 'Draw pen', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  const viewport = page.getByTestId('opencanvas-document-viewport');
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error('OpenCanvas viewport bounds are unavailable.');
  await viewport.dispatchEvent('pointerdown', {
    pointerId: 91, pointerType: 'pen', button: 0, pressure: 0.2,
    tiltX: 10, tiltY: -20, twist: 30,
    clientX: viewportBox.x + 220, clientY: viewportBox.y + 220,
  });
  await viewport.dispatchEvent('pointermove', {
    pointerId: 91, pointerType: 'pen', button: 0, pressure: 0.55,
    tiltX: 25, tiltY: -35, twist: 45,
    clientX: viewportBox.x + 260, clientY: viewportBox.y + 245,
  });
  await viewport.dispatchEvent('pointermove', {
    pointerId: 91, pointerType: 'pen', button: 0, pressure: 0.9,
    tiltX: 45, tiltY: -55, twist: 60,
    clientX: viewportBox.x + 300, clientY: viewportBox.y + 210,
  });
  await viewport.dispatchEvent('pointerup', {
    pointerId: 91, pointerType: 'pen', button: 0,
    clientX: viewportBox.x + 300, clientY: viewportBox.y + 210,
  });
  const pressureExportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' })
    .evaluate((button: HTMLButtonElement) => button.click());
  const pressureExport = await pressureExportPromise;
  const pressureExportStream = await pressureExport.createReadStream();
  let pressureSvg = '';
  for await (const chunk of pressureExportStream) pressureSvg += chunk.toString();
  const pressureGroups = pressureSvg.split('data-node-kind="pen"').slice(1)
    .map((group) => group.split('</g>')[0]);
  expect(pressureGroups.some((group) => group.match(/<path /g)?.length === 2)).toBe(true);
  expect(pressureSvg).toContain('data-node-kind="sticky"');
  expect(pressureSvg).toContain('data-node-kind="callout"');

  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const precisionSection = page.getByRole('region', { name: 'Canvas precision' });
  await precisionSection.getByRole('checkbox', { name: 'Grid' }).check();
  await precisionSection.getByLabel('Grid size').fill('25');
  await precisionSection.getByRole('button', { name: 'Update canvas precision' }).click();
  await page.getByRole('button', { name: 'Close inspector' })
    .evaluate((button: HTMLButtonElement) => button.click());

  const fallbackLink = page.getByRole('link', { name: 'Use React Flow' });
  if (await fallbackLink.isVisible()) {
    await fallbackLink.evaluate((link: HTMLAnchorElement) => link.click());
  }
  await expect(page.locator('.react-flow__node')).toHaveCount(15, { timeout: 30_000 });
  await expect(page.locator('.react-flow__node', { hasText: 'Renamed in OpenCanvas' })).toHaveCount(4);
  await expect(page.locator('.react-flow__node', { hasText: 'Linked symbol subtitle' })).toHaveCount(2);
  await expect(page.locator('.react-flow__node', { hasText: 'Service 2' })).toHaveCount(0);
  await expect(page.locator('.react-flow__node', { hasText: 'Process' })).toHaveCount(1);
  await expect(page.locator('.react-flow__node', { hasText: 'Sticky note' })).toHaveCount(1);
  await expect(page.locator('.react-flow__node', { hasText: 'Callout' })).toHaveCount(1);

  await page.getByRole('link', { name: 'Try OpenCanvas' }).click();
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const reopenedPrecision = page.getByRole('region', { name: 'Canvas precision' });
  await expect(reopenedPrecision.getByRole('checkbox', { name: 'Grid' })).toBeChecked();
  await expect(reopenedPrecision.getByLabel('Grid size')).toHaveValue('25');
});

test('undoes, redoes, and reloads an OpenCanvas production write', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const label = page.getByRole('textbox', { name: 'Label for Service 1' });
  await label.fill('Persisted OpenCanvas node');
  await label.press('Enter');
  await expect(page.getByRole('button', { name: 'Select Persisted OpenCanvas node' })).toBeAttached();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Select Service 1' })).toBeAttached();
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(page.getByRole('button', { name: 'Select Persisted OpenCanvas node' })).toBeAttached();

  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__node', { hasText: 'Persisted OpenCanvas node' })).toHaveCount(1);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('.react-flow__node', { hasText: 'Persisted OpenCanvas node' })).toHaveCount(1, {
    timeout: 30_000,
  });
});

test('navigates the semantic scene spatially without losing keyboard focus', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, selectFamily(graph, FAMILY_CORPUS[0]));
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole('navigation', { name: 'Canvas semantic scene' })).toBeAttached();
  await expect(page.getByRole('complementary', { name: 'OpenCanvas inspector' })).toHaveCount(0);
  const accessibility = await page.context().newCDPSession(page);
  const accessibilityTree = await accessibility.send('Accessibility.getFullAXTree');
  const interactiveRoles = new Set(['button', 'checkbox', 'combobox', 'link', 'textbox']);
  const unnamedInteractiveNodes = accessibilityTree.nodes.filter((node) => (
    interactiveRoles.has(String(node.role?.value ?? '').toLowerCase())
    && String(node.name?.value ?? '').trim().length === 0
  ));
  expect(unnamedInteractiveNodes).toEqual([]);

  const first = page.getByRole('button', { name: 'Select Service 1' });
  await first.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');

  const spatialNeighbor = page.locator('[data-canvas-semantic-node="true"][aria-pressed="true"]');
  await expect(spatialNeighbor).toHaveCount(1);
  await expect(spatialNeighbor).toBeFocused();
  await expect(spatialNeighbor).not.toHaveText('Select Service 1');
  await expect(page.getByText('1 node selected.')).toBeAttached();
});

test('creates and deletes a connector through canonical production commands', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  const familyGraph = selectFamily(graph, FAMILY_CORPUS[0]);
  await importIntoProductionEditor(page, familyGraph);
  const initialEdgeCount = familyGraph.edges.length;
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });

  const first = page.getByRole('button', { name: 'Select Service 1' });
  await first.focus();
  await first.press('Enter');
  const second = page.getByRole('button', { name: 'Select Service 2' });
  await second.focus();
  await second.press('Shift+Enter');
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  const alignTop = page.getByRole('button', { name: 'Align top', exact: true });
  await alignTop.focus();
  await alignTop.press('Enter');
  await page.getByRole('button', { name: 'Connect selected nodes' }).click();
  const remove = page.getByRole('button', { name: 'Delete connector node-0 to node-1' });
  await expect(remove).toBeAttached();
  await remove.focus();
  await remove.press('Enter');
  await expect(remove).toHaveCount(0);

  const createLoop = page.getByRole('button', { name: 'Create self-loop for Service 1' });
  await createLoop.focus();
  await createLoop.press('Enter');
  const removeLoop = page.getByRole('button', { name: 'Delete connector node-0 to node-0' });
  await expect(removeLoop).toBeAttached();
  await removeLoop.focus();
  await removeLoop.press('Enter');

  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(initialEdgeCount);
});

test('round-trips typed production properties across every node family group', async ({ page }) => {
  const graph = await createMixedFamilyFixture(page);
  await importIntoProductionEditor(page, graph);
  const currentUrl = new URL(page.url());
  const separator = currentUrl.hash.includes('?') ? '&' : '?';
  await page.goto(
    `${currentUrl.origin}${currentUrl.pathname}${currentUrl.hash}${separator}renderer=opencanvas`
  );
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();

  async function fillAndSubmit(label: string, value: string): Promise<void> {
    const input = page.getByLabel(label, { exact: true });
    await input.fill(value);
    await input.press('Enter');
  }
  await fillAndSubmit('Subtitle for Service 1', 'Edited runtime');
  const servicePropertiesForm = page.locator('form[aria-label="Properties for Service 1"]');
  await servicePropertiesForm.locator('select[name="shape"]').selectOption('custom-path', { force: true });
  await servicePropertiesForm.locator('input[name="customSvgPath"]')
    .fill('M0 0 L100 0 L80 50 L100 100 L0 100 L20 50 Z');
  const updateServiceProperties = servicePropertiesForm.getByRole('button', { name: 'Update properties for Service 1' });
  await updateServiceProperties.focus();
  await updateServiceProperties.press('Enter');
  const serviceSizing = page.locator('form[aria-label="Sizing for Service 1"]');
  await serviceSizing.locator('select[name="mode"]').selectOption('responsive', { force: true });
  await serviceSizing.locator('select[name="overflow"]').selectOption('wrap', { force: true });
  await serviceSizing.locator('input[name="maxWidth"]').fill('180', { force: true });
  const updateServiceSizing = serviceSizing.locator('button[type="submit"]');
  await updateServiceSizing.focus();
  await updateServiceSizing.press('Enter');
  await fillAndSubmit('New page name', 'Runtime detail');
  await expect(page.getByRole('button', { name: 'Open page Runtime detail', exact: true }))
    .toBeAttached();
  await page.getByLabel('Parent for Service 2', { exact: true }).selectOption('node-10');
  await fillAndSubmit('New layer name', 'Runtime');
  const serviceLayer = page.getByLabel('Layer for Service 2', { exact: true });
  await serviceLayer.selectOption({ label: 'Runtime' });
  const runtimeLayerId = await serviceLayer.inputValue();
  const runtimeLocked = page.getByLabel('Locked Runtime', { exact: true });
  await runtimeLocked.focus();
  await runtimeLocked.press('Space');
  const updateRuntimeLayer = page.getByRole('button', { name: 'Update layer Runtime', exact: true });
  await updateRuntimeLayer.focus();
  await updateRuntimeLayer.press('Enter');
  await expect(serviceLayer).toBeDisabled();
  const moveServiceFront = page.getByRole('button', { name: 'Move Service 1 front', exact: true });
  await moveServiceFront.focus();
  await moveServiceFront.press('Enter');
  const serviceLayout = page.getByLabel('Content layout for node-0');
  await serviceLayout.getByLabel('top content padding', { exact: true }).fill('20');
  const rightPlacement = serviceLayout.getByRole('button', { name: 'right' });
  await rightPlacement.focus();
  await rightPlacement.press('Enter');
  await fillAndSubmit('Font size for Portable text', '26');
  await fillAndSubmit('Environment for Orders API', 'staging');
  await fillAndSubmit('Stereotype for Order', 'service');
  await fillAndSubmit('Alias for Checkout experience', 'checkout.edited');
  await fillAndSubmit('Actor for Confirm payment', 'Operator');
  await fillAndSubmit('Variant for console.openflowkit.local', 'settings');
  const collapsed = page.getByLabel('Collapsed for Platform', { exact: true });
  await collapsed.focus();
  await collapsed.press('Space');
  const containerSubmit = page.getByRole('button', { name: 'Update properties for Platform' });
  await containerSubmit.focus();
  await containerSubmit.press('Enter');

  await page.getByRole('link', { name: 'Use React Flow' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(30, { timeout: 30_000 });
  await page.getByRole('link', { name: 'Try OpenCanvas' }).click();
  await expect(page.getByText(/· ready · write canary/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Inspector', exact: true }).click();
  await expect(page.getByLabel('Subtitle for Service 1', { exact: true })).toHaveValue('Edited runtime');
  const reopenedServiceProperties = page.locator('form[aria-label="Properties for Service 1"]');
  await expect(reopenedServiceProperties.locator('select[name="shape"]')).toHaveValue('custom-path');
  await expect(reopenedServiceProperties.locator('input[name="customSvgPath"]'))
    .toHaveValue('M0 0 L100 0 L80 50 L100 100 L0 100 L20 50 Z');
  const reopenedServiceSizing = page.locator('form[aria-label="Sizing for Service 1"]');
  await expect(reopenedServiceSizing.locator('select[name="mode"]')).toHaveValue('responsive');
  await expect(reopenedServiceSizing.locator('select[name="overflow"]')).toHaveValue('wrap');
  await expect(reopenedServiceSizing.locator('input[name="maxWidth"]')).toHaveValue('180');
  await expect(page.getByLabel('Content layout for node-0')
    .getByLabel('top content padding', { exact: true })).toHaveValue('20');
  await expect(page.getByRole('button', { name: 'Open page Runtime detail', exact: true }))
    .toBeAttached();
  await expect(page.getByLabel('Parent for Service 2', { exact: true })).toHaveValue('node-10');
  await expect(page.getByLabel('Layer for Service 2', { exact: true })).toHaveValue(runtimeLayerId);
  await expect(page.getByLabel('Layer for Service 2', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Locked Runtime', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Content layout for node-0').getByRole('button', { name: 'right' }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Font size for Portable text', { exact: true })).toHaveValue('26');
  await expect(page.getByLabel('Environment for Orders API', { exact: true })).toHaveValue('staging');
  await expect(page.getByLabel('Stereotype for Order', { exact: true })).toHaveValue('service');
  await expect(page.getByLabel('Alias for Checkout experience', { exact: true })).toHaveValue('checkout.edited');
  await expect(page.getByLabel('Actor for Confirm payment', { exact: true })).toHaveValue('Operator');
  await expect(page.getByLabel('Variant for console.openflowkit.local', { exact: true })).toHaveValue('settings');
  await expect(page.getByLabel('Collapsed for Platform', { exact: true })).toBeChecked();
});
