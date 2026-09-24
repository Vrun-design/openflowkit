// Gap check: "manual waypoints survive" is a headline promise in the plan, and
// nothing proved a dragged segment keeps its shape when a bound node moves.
// npm run e2e:headed -- e2e/waypoints.spec.ts
import { expect, test } from './test';
import {
  centreOf, connect, connector, connectorSamples, drawShape, midpointOf, openCanvas, rect, state, worldToScreen,
} from './helpers';

test('dragging a segment pins a waypoint, and moving a bound node keeps it', async ({ page }) => {
  await openCanvas(page);
  const a = await drawShape(page, 'r', 300, 380);
  const b = await drawShape(page, 'r', 820, 380);
  const edge = await connect(page, a, b);
  // The style bar anchors over the edge midpoint; dismiss it before aiming.
  await page.keyboard.press('Escape');

  expect((await connector(page, edge)).waypoints).toHaveLength(0);
  expect((await connector(page, edge)).route.ownership).toBe('automatic');

  const offset = await worldToScreen(page, a);
  const mid = midpointOf((await connectorSamples(page, edge))!);
  const at = { x: mid.x + offset.x, y: mid.y + offset.y };

  // Select the edge, then pull its middle down: that is what mints a waypoint.
  await page.mouse.click(at.x, at.y);
  await expect.poll(async () => (await state(page)).selectedConnector).toBe(edge);

  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x, at.y + 120, { steps: 10 });
  await page.mouse.up();

  await expect.poll(async () => (await connector(page, edge)).waypoints.length).toBeGreaterThan(0);
  const pinned = (await connector(page, edge)).waypoints;
  expect((await connector(page, edge)).route.ownership).not.toBe('automatic');

  // Move the target node: the route recomputes, the authored waypoint stays.
  const before = (await rect(page, b))!;
  const centre = await centreOf(page, b);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 40, centre.y - 150, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await rect(page, b))!.y)).not.toBe(Math.round(before.y));

  const after = (await connector(page, edge)).waypoints;
  expect(after).toHaveLength(pinned.length);
  expect(after.map(({ x, y }) => [Math.round(x), Math.round(y)]))
    .toEqual(pinned.map(({ x, y }) => [Math.round(x), Math.round(y)]));

  // Undo returns the connector to an automatic route in one step.
  await page.keyboard.press('ControlOrMeta+z'); // undo the node move
  await page.keyboard.press('ControlOrMeta+z'); // undo the waypoint
  await expect.poll(async () => (await connector(page, edge)).waypoints).toHaveLength(0);
});
