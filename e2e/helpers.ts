// Shared e2e helpers. The canvas fills the viewport behind floating chrome, so
// every click has to go through `emptyPoint`: elementFromPoint decides whether a
// coordinate is really canvas and not a control painted over it.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface V2Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface V2State {
  revision: number;
  nodes: string[];
  connectors: string[];
  selectedNodes: string[];
  selectedConnector: string | null;
  tool: string;
}

export interface V2Node {
  id: string;
  kind: string;
  zIndex: number;
  /** Node lock rides on content.sectionLocked; `locked` on a layer is separate. */
  content?: { sectionLocked?: boolean };
  transform?: { translation: { x: number; y: number }; rotationRadians: number; scale: { x: number; y: number } };
  appearance?: { fill?: string; stroke?: string };
}

export interface V2Connector {
  id: string;
  route: { kind: string; ownership: string };
  waypoints: { x: number; y: number }[];
}

export interface V2Document {
  pages: { id: string; name: string; nodes: V2Node[]; connectors: V2Connector[] }[];
}

interface V2Api {
  getState(): V2State;
  getDocument(): V2Document | null;
  getNodeRect(id: string): V2Rect | null;
  getRenderDiagnostics(): { alignmentGuidesVisible: boolean } | undefined;
  getLiveConnectorSamples(id: string): { x: number; y: number }[] | null;
}

export const state = (page: Page): Promise<V2State> =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getState());

export const doc = (page: Page): Promise<V2Document | null> =>
  page.evaluate(() => (window as unknown as { __V2__: V2Api }).__V2__.getDocument());

export const rect = (page: Page, id: string): Promise<V2Rect | null> =>
  page.evaluate(
    (nodeId: string) => (window as unknown as { __V2__: V2Api }).__V2__.getNodeRect(nodeId),
    id
  );

export const guidesVisible = (page: Page): Promise<boolean> =>
  page.evaluate(
    () =>
      (window as unknown as { __V2__: V2Api }).__V2__.getRenderDiagnostics()?.alignmentGuidesVisible ?? false
  );

/** True when ⌘L has locked this node. */
export const isLocked = async (page: Page, id: string): Promise<boolean> =>
  (await node(page, id)).content?.sectionLocked === true;

/** Page-1 node ids from back to front — z-order lives in `zIndex`, not array order. */
export async function stackOrder(page: Page): Promise<string[]> {
  const document = await doc(page);
  return [...(document?.pages[0]?.nodes ?? [])]
    .sort((left, right) => left.zIndex - right.zIndex)
    .map(({ id }) => id);
}

/** First node on page 1 matching `id`, straight from the document. */
export async function node(page: Page, id: string): Promise<V2Node> {
  const document = await doc(page);
  const found = document?.pages[0]?.nodes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`node "${id}" is not on page 1`);
  return found;
}

/**
 * A viewport coordinate that really hits the canvas, searching outward from the
 * asked-for point when chrome covers it.
 */
export const emptyPoint = (page: Page, x: number, y: number): Promise<{ x: number; y: number }> =>
  page.evaluate(
    ({ px, py }) => {
      const at = (ax: number, ay: number) => {
        const el = document.elementFromPoint(ax, ay);
        return el instanceof HTMLCanvasElement && el.closest('[data-testid="v2-canvas"]')
          ? { x: ax, y: ay }
          : null;
      };
      const direct = at(px, py);
      if (direct) return direct;
      for (const [dx, dy] of [[60, 0], [-60, 0], [0, 60], [0, -60], [120, 0], [0, 120], [300, 100], [500, 200]]) {
        const found = at(px + dx, py + dy);
        if (found) return found;
      }
      throw new Error('no empty canvas point');
    },
    { px: x, py: y }
  );

export async function openCanvas(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByTestId('v2-canvas').focus();
}

/**
 * Draws one shape with `tool` at a canvas point and returns its id. Escape
 * closes the label editor the click opens, so the next keystroke is a shortcut
 * and not typing.
 */
export async function drawShape(page: Page, tool: string, x: number, y: number): Promise<string> {
  const before = (await state(page)).nodes;
  await page.keyboard.press(tool);
  const point = await emptyPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
  await expect.poll(async () => (await state(page)).nodes.length).toBe(before.length + 1);
  await page.keyboard.press('Escape');
  const after = (await state(page)).nodes;
  const created = after.find((id) => !before.includes(id));
  if (!created) throw new Error('no new node after draw');
  return created;
}

/** Canvas-relative screen centre of a node, ready for page.mouse. */
export async function centreOf(page: Page, id: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const r = (await rect(page, id))!;
  return { x: box.x + r.x + r.width / 2, y: box.y + r.y + r.height / 2 };
}

export async function clickNode(page: Page, id: string, modifier?: 'Shift'): Promise<void> {
  const centre = await centreOf(page, id);
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.click(centre.x, centre.y);
  if (modifier) await page.keyboard.up(modifier);
}

export const connectorSamples = (page: Page, id: string): Promise<{ x: number; y: number }[] | null> =>
  page.evaluate(
    (connectorId: string) =>
      (window as unknown as { __V2__: V2Api }).__V2__.getLiveConnectorSamples(connectorId),
    id
  );

export async function connector(page: Page, id: string): Promise<V2Connector> {
  const document = await doc(page);
  const found = document?.pages[0]?.connectors.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`connector "${id}" is not on page 1`);
  return found;
}

/**
 * Connector samples come back in world space; node rects come back in screen
 * space. This delta converts one to the other for the current camera.
 */
export async function worldToScreen(page: Page, anyNodeId: string): Promise<{ x: number; y: number }> {
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const screen = (await rect(page, anyNodeId))!;
  const world = (await node(page, anyNodeId)).transform!.translation;
  return { x: box.x + screen.x - world.x, y: box.y + screen.y - world.y };
}

/** The point half way along a polyline, by arc length. */
export function midpointOf(lane: { x: number; y: number }[]): { x: number; y: number } {
  const length = lane.reduce(
    (total, point, index) => (index === 0 ? 0 : total + Math.hypot(point.x - lane[index - 1]!.x, point.y - lane[index - 1]!.y)),
    0
  );
  let walked = 0;
  for (let i = 1; i < lane.length; i += 1) {
    const segment = Math.hypot(lane[i]!.x - lane[i - 1]!.x, lane[i]!.y - lane[i - 1]!.y);
    if (walked + segment >= length / 2) {
      const ratio = segment === 0 ? 0 : (length / 2 - walked) / segment;
      return {
        x: lane[i - 1]!.x + (lane[i]!.x - lane[i - 1]!.x) * ratio,
        y: lane[i - 1]!.y + (lane[i]!.y - lane[i - 1]!.y) * ratio,
      };
    }
    walked += segment;
  }
  return lane.at(-1)!;
}

/** Drags a connector from `fromId`'s right handle onto `toId`, returning its id. */
export async function connect(page: Page, fromId: string, toId: string): Promise<string> {
  const before = (await state(page)).connectors.length;
  const box = (await page.locator('[data-testid="v2-canvas"] canvas').boundingBox())!;
  const from = (await rect(page, fromId))!;
  const to = (await rect(page, toId))!;
  await page.mouse.move(box.x + from.x + from.width + 22, box.y + from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + to.x + 20, box.y + to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).connectors.length).toBe(before + 1);
  return (await state(page)).connectors.at(-1)!;
}
