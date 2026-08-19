import { expect, test, type Page } from '@playwright/test';

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
  await page.getByRole('button', { name: 'Close inspector' })
    .evaluate((button: HTMLButtonElement) => button.click());
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
  for (const primitive of ['pen', 'highlighter', 'line', 'arrow', 'sticky', 'callout']) {
    await page.getByRole('button', { name: `Add ${primitive}`, exact: true })
      .evaluate((button: HTMLButtonElement) => button.click());
  }
  await page.getByRole('button', { name: 'Draw pen', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  const viewport = page.getByTestId('opencanvas-document-viewport');
  const viewportBox = await viewport.boundingBox();
  if (!viewportBox) throw new Error('OpenCanvas viewport bounds are unavailable.');
  await page.mouse.move(viewportBox.x + 220, viewportBox.y + 220);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + 260, viewportBox.y + 245, { steps: 4 });
  await page.mouse.move(viewportBox.x + 300, viewportBox.y + 210, { steps: 4 });
  await page.mouse.up();

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
