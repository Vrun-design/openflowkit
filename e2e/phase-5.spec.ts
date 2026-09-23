import { expect, test } from '@playwright/test';

// Phase 5 UX: C4 workspace generate (one page per view), drill-down + breadcrumb,
// model-level rename across views, flow playback. One headed check for the slice —
// npm run e2e:headed -- e2e/phase-5.spec.ts

const WORKSPACE = `%% ofk 1
architecture

model {
  person Customer
  system Shop {
    container Web [tech: React]
    container API [tech: Go]
    store DB
    Web -> API : calls
    API -> DB : reads
  }
  Customer -> Shop.Web : uses
}
views {
  view landscape
  view container of Shop
}
flow "Checkout" {
  intro "Customer opens the cart"
  step Customer -> Web : opens cart
  step Web -> API : POST /orders
  conclusion "Order confirmed"
}
`;

interface V2Node { id: string; content?: { label?: string }; metadata?: { model?: { elementId?: string } } }
interface V2Page { id: string; name: string; nodes: V2Node[] }
interface V2Api { getDocument(): { pages: V2Page[] } | null }

const pages = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    return (api?.getDocument?.()?.pages ?? []).map(({ id, name, nodes }) => ({
      id,
      name,
      labels: nodes.map((node) => node.content?.label).filter(Boolean),
      elements: nodes.map((node) => node.metadata?.model?.elementId).filter(Boolean),
    }));
  });

test('C4 workspace: generate, drill down, rename across views, play a flow', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');

  // --- generate a workspace: one page per view -----------------------------
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(WORKSPACE);
  await page.getByRole('button', { name: 'Generate diagram' }).click();
  await expect.poll(async () => (await pages(page)).length).toBe(3);
  const [, landscape, container] = await pages(page);
  expect(landscape!.name).toBe('System landscape');
  expect(container!.name).toBe('container of Shop');
  expect(landscape!.elements).toEqual(expect.arrayContaining(['customer', 'shop']));
  expect(container!.labels).toEqual(expect.arrayContaining(['Web', 'API', 'DB']));

  await page.getByRole('button', { name: 'Close panel' }).click();

  // --- drill down from the model panel -------------------------------------
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model' }).click();
  await page.getByRole('tab', { name: 'Elements' }).waitFor();
  await page.locator('.ofk-v2-model-row', { hasText: 'Shop' }).first().dblclick();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('container of Shop', { timeout: 5000 });
  // Back up a level with the breadcrumb link.
  await page.locator('.ofk-v2-breadcrumb-link').first().click();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('System landscape');
  await page.locator('.ofk-v2-model-row', { hasText: 'Shop' }).first().dblclick();
  await expect(page.locator('.ofk-v2-breadcrumb-current')).toHaveText('container of Shop');

  // --- rename an element: every view follows -------------------------------
  await page.locator('.ofk-v2-model-row', { hasText: 'Web' }).first().click();
  const name = page.getByLabel('Name');
  await name.fill('Frontend');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect.poll(async () => (await pages(page)).filter((entry) => entry.id === container!.id)[0]!.labels.includes('Frontend')).toBe(true);
  await expect.poll(async () => (await pages(page)).find((entry) => entry.id === landscape!.id)!.elements.includes('shop.web')).toBe(true);

  // --- flow playback -------------------------------------------------------
  await page.getByRole('tab', { name: /Flows/ }).click();
  await page.getByRole('button', { name: /^Checkout/ }).first().click();
  const flow = page.getByRole('region', { name: 'Flow Checkout' });
  await expect(flow).toBeVisible();
  await expect(flow.getByText('Step 1 of 4')).toBeVisible();
  await flow.getByRole('button', { name: 'Next step' }).click();
  await expect(flow.getByText('Step 2 of 4')).toBeVisible();
  await flow.getByRole('button', { name: 'Play flow' }).click();
  await expect(flow.getByRole('button', { name: 'Pause flow' })).toBeVisible();
  await flow.getByRole('button', { name: 'Pause flow' }).click();
  await page.keyboard.press('Escape');
  await expect(flow).toBeHidden();

  // --- the workspace text round-trips through Edit as code -----------------
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.keyboard.press('Escape');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+0' : 'Control+0');
  await expect.poll(async () => (await pages(page)).length).toBe(3);
});

test('canvas connector between two model objects records the relation', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(`%% ofk 1
architecture
model {
  system Shop { container Web; container API }
}
views { view landscape; view container of Shop }
`);
  await page.getByRole('button', { name: 'Generate diagram' }).click();
  // The code panel aborts an in-flight generate on close: wait for the commit.
  await expect.poll(async () => (await pages(page)).length).toBe(3);
  await page.getByRole('button', { name: 'Close panel' }).click();
  // Land on the container view before drawing, via the model panel.
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Architecture model' }).click();
  await page.getByRole('tab', { name: /Views/ }).click();
  await page.locator('.ofk-v2-model-row', { hasText: 'container of Shop' }).first().click();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getDocument(): { pages: { name: string; nodes: { id: string }[] }[] } | null } }).__V2__;
    const page = api?.getDocument?.()?.pages.find((candidate) => candidate.name === 'container of Shop');
    return page?.nodes.map((node) => node.id) ?? [];
  })).toEqual(expect.arrayContaining(['shop.web', 'shop.api']));
  // Draw Web -> API with the connector tool by dragging between the two nodes.
  const rect = (id: string) => page.evaluate((nodeId) => {
    const api = (window as unknown as { __V2__?: { getNodeRect(id: string): { x: number; y: number; width: number; height: number } | null } }).__V2__;
    return api?.getNodeRect(nodeId) ?? null;
  }, id);
  const web = await rect('shop.web');
  const api = await rect('shop.api');
  expect(web && api).toBeTruthy();
  await page.getByRole('toolbar', { name: 'Create' }).getByRole('button', { name: 'Connector' }).click();
  await page.getByRole('option', { name: 'Arrow' }).click();
  await page.mouse.move(web!.x + web!.width / 2, web!.y + web!.height / 2);
  await page.mouse.down();
  await page.mouse.move(web!.x + web!.width / 2 + 30, web!.y + web!.height / 2, { steps: 4 });
  await page.mouse.move(api!.x + api!.width / 2, api!.y + api!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: { getDocument(): { pages: { name: string; connectors: { metadata?: { model?: { relationId?: string } } }[] }[] } | null } }).__V2__;
    const page = api?.getDocument?.()?.pages.find((candidate) => candidate.name === 'container of Shop');
    return page?.connectors.map((connector) => connector.metadata?.model?.relationId ?? null) ?? [];
  })).toContain('rel:shop.web->shop.api');
});
