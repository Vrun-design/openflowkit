import { rect, state } from './helpers';
import { expect, test } from './test';

// Selecting an arrow whose model relation carries a `link` shows its source in the connector's context bar.
// CI=1 npx playwright test e2e/connector-source.spec.ts

const DSL = `architecture
model {
  system Shop {
    container frontend
    container checkout
    frontend -> checkout : calls [link: https://github.com/acme/shop/blob/HEAD/kubernetes-manifests/frontend.yaml#L68]
  }
}
views {
  view container of Shop
}`;

test('selecting an arrow shows where the relation came from @gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const source = page.getByRole('textbox', { name: 'Diagram source' });
  await source.fill(DSL);
  await source.press('ControlOrMeta+Enter');
  await expect.poll(async () => (await state(page)).connectors.length).toBe(1);
  await page.getByRole('button', { name: 'Close panel' }).click();
  const id = (await state(page)).connectors[0]!;
  // The arrow runs straight from frontend's right edge to checkout's left edge.
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const from = (await rect(page, 'shop.frontend'))!;
  const to = (await rect(page, 'shop.checkout'))!;
  await page.mouse.click(box.x + (from.x + from.width + to.x) / 2, box.y + from.y + from.height / 2);
  await expect.poll(async () => (await state(page)).selectedConnector).toBe(id);
  const bar = page.getByRole('toolbar', { name: 'Connector actions' });
  const link = bar.getByRole('link', { name: /kubernetes-manifests\/frontend\.yaml:68/ });
  await expect(link).toHaveAttribute('href', 'https://github.com/acme/shop/blob/HEAD/kubernetes-manifests/frontend.yaml#L68');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(bar).toContainText('frontend → checkout');
});
