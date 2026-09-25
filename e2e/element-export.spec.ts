// Element export: right-click any layer, choose Export…, and the one export
// panel opens scoped to that element — a shape, a container's whole subtree,
// or a lone connection. npm run e2e:headed -- e2e/element-export.spec.ts
import { expect, test } from './test';
import type { Locator } from '@playwright/test';
import {
  centreOf, clickNode, connect, connectorSamples, doc, drawShape, midpointOf, openCanvas, rect, state, worldToScreen,
} from './helpers';

/** Ids can contain characters the serializer escapes inside attributes. */
const attr = (id: string): string =>
  id.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

test('right-click export scopes to the element, its subtree, and a lone connection @gate', async ({ page }) => {
  await openCanvas(page);
  const first = await drawShape(page, 'r', 480, 260);
  const second = await drawShape(page, 'r', 780, 260);
  const edge = await connect(page, first, second);
  // The connector style bar anchors over the edge midpoint; dismiss it.
  await page.keyboard.press('Escape');

  const openExport = async (point: { x: number; y: number }) => {
    await page.mouse.click(point.x, point.y, { button: 'right' });
    await page.getByRole('menu', { name: 'Canvas actions' }).getByRole('menuitem', { name: 'Export…' }).click();
    const panel = page.getByRole('dialog', { name: 'Export', exact: true });
    await expect(panel).toBeVisible();
    return panel;
  };
  const downloadSvg = async (panel: Locator): Promise<string> => {
    await panel.getByRole('radio', { name: 'SVG', exact: true }).check();
    const pending = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download', exact: true }).click();
    const file = await pending;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);
    return (await (await file.createReadStream()).toArray()).join('');
  };

  // One shape: the panel opens on Selection and only that node leaves.
  const single = await openExport(await centreOf(page, first));
  await expect(single.getByRole('radio', { name: 'Selection', exact: true })).toBeChecked();
  await expect(single.getByText('The selected element.', { exact: true })).toBeVisible();
  const shapeSvg = await downloadSvg(single);
  expect(shapeSvg).toContain(`data-node-id="${attr(first)}"`);
  expect(shapeSvg).not.toContain(`data-node-id="${attr(second)}"`);

  // A lone connection: drawn without its endpoints, framed on itself.
  // Aim while the endpoints are still top-level: a nested node's transform is
  // parent-relative, and worldToScreen assumes a world translation.
  const origin = await worldToScreen(page, first);
  const mid = midpointOf((await connectorSamples(page, edge))!);
  const edgePanel = await openExport({ x: origin.x + mid.x, y: origin.y + mid.y });
  await expect(edgePanel.getByText('The selected connection.', { exact: true })).toBeVisible();
  const edgeSvg = await downloadSvg(edgePanel);
  expect(edgeSvg).toContain(`data-connector-id="${attr(edge)}"`);
  expect(edgeSvg).not.toContain('data-node-id="');

  // A group exports its members too, however deep.
  await clickNode(page, first);
  await clickNode(page, second, 'Shift');
  await page.keyboard.press('ControlOrMeta+g');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(3);
  const grouped = await openExport(await centreOf(page, first));
  await expect(grouped.getByText('The selected group and everything inside it.', { exact: true })).toBeVisible();
  const groupSvg = await downloadSvg(grouped);
  expect(groupSvg).toContain(`data-node-id="${attr(first)}"`);
  expect(groupSvg).toContain(`data-node-id="${attr(second)}"`);

  // A section around that group exports the same subtree one level up. A click
  // inside selects the group, so aim at the section's own title band.
  await page.keyboard.press('ControlOrMeta+Alt+g');
  await expect.poll(async () => (await state(page)).nodes.length).toBe(4);
  const sectionId = (await doc(page))!.pages[0]!.nodes.find((node) => node.kind === 'section')!.id;
  const sectionRect = (await rect(page, sectionId))!;
  const canvasBox = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const section = await openExport({ x: canvasBox.x + sectionRect.x + 24, y: canvasBox.y + sectionRect.y + 18 });
  await expect(section.getByText('The selected section and everything inside it.', { exact: true })).toBeVisible();
  const sectionSvg = await downloadSvg(section);
  expect(sectionSvg).toContain(`data-node-id="${attr(first)}"`);
  expect(sectionSvg).toContain(`data-node-id="${attr(second)}"`);

  // Escape returns you to the canvas it came from.
  const reopened = await openExport(await centreOf(page, first));
  await page.keyboard.press('Escape');
  await expect(reopened).toBeHidden();
  await expect(page.getByTestId('v2-canvas')).toBeFocused();
});
