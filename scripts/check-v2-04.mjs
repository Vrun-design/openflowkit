import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// V2-04 gate: create → connect → label → move → undo → redo → save → reload
// → SVG export, plus a keyboard-only variant. Screenshots to docs/evidence/v2-04.
//
// Run against a flag-enabled production build (no HMR socket, so no
// dev-client reloads mid-run):
//   VITE_V2_EDITOR=1 npm run build && npx vite preview --host 127.0.0.1 --port 4191
//   V2_BASE_URL=http://127.0.0.1:4191 node scripts/check-v2-04.mjs
// Screenshots and the editing journey use separate browser launches. The
// journey tolerates an unexpected same-URL reload (headless SwiftShader
// environments occasionally drop one) by restarting on a fresh document,
// up to 3 attempts; a restart is logged as `attempt N`.
const BASE = process.env.V2_BASE_URL ?? 'http://127.0.0.1:4190';
const EVIDENCE = 'docs/evidence/v2-04';
const RUN_ID = Date.now().toString(36);

function launchBrowser() {
  return chromium.launch({
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
  });
}

function state(page) {
  return page.evaluate(() => window.__V2__.getState());
}

function documentJson(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__V2__.getDocument())));
}

async function waitSaved(page, checkStable) {
  const deadline = Date.now() + 20000;
  for (;;) {
    checkStable('save-wait');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('timed out waiting for saved status');
    try {
      await page.waitForFunction(() => window.__V2__?.getState().save === 'saved', null, {
        timeout: Math.min(2000, remaining),
        polling: 500,
      });
      return;
    } catch (pollError) {
      if (Date.now() >= deadline) throw pollError;
    }
  }
}

// After a scripted reload with no new edits, the correct status is clean:
// autosave must not re-save an unchanged document.
async function waitClean(page, checkStable) {
  const deadline = Date.now() + 20000;
  for (;;) {
    checkStable('reload-settle');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('timed out waiting for clean status');
    const save = await page.evaluate(() => window.__V2__?.getState().save);
    if (save === 'clean' || save === 'saved') return save;
    await page.waitForTimeout(500);
  }
}

async function canvasArea(page) {
  return page.evaluate(() => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const regions = Array.from(document.querySelectorAll('.ofk-floating-region')).map((el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const union = regions.reduce((area, rect) => area + rect.width * rect.height, 0);
    return {
      viewport,
      regions: regions.length,
      chromePx: Math.round(union),
      canvasPercent: Number(
        (((viewport.width * viewport.height - union) / (viewport.width * viewport.height)) * 100).toFixed(1)
      ),
    };
  });
}

async function waitForEditor(page) {
  await page.getByTestId('v2-editor').waitFor();
  await page.waitForFunction(() => window.__V2__?.getState(), null, { timeout: 30000, polling: 500 });
}

async function openDocument(page, docId) {
  await page.goto(`${BASE}/#/v2/${docId}`);
  await waitForEditor(page);
}

fs.mkdirSync(EVIDENCE, { recursive: true });

// ---- 04a shots: shell in both themes and viewports, idle canvas area ----
if (!process.env.V2_SKIP_SHOTS) {
  const browser = await launchBrowser();
  try {
    const docId = `v2-04-shots-${RUN_ID}`;
    for (const theme of ['light', 'dark']) {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
        const page = await browser.newPage({ viewport });
        page.setDefaultTimeout(30000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(String(error)));
        await page.addInitScript((theme) => localStorage.setItem('openflowkit-theme', theme), theme);
        await openDocument(page, docId);
        const initial = await state(page);
        assert.equal(initial.nodes.length, 0, 'fresh doc opens empty');
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${EVIDENCE}/04a-shell-${theme}-${viewport.width}x${viewport.height}.png` });
        assert.deepEqual(errors, [], `no page errors (${theme} ${viewport.width}x${viewport.height})`);
        if (theme === 'light' && viewport.width === 1440) {
          const area = await canvasArea(page);
          console.log(`idle canvas area 1440x900: ${area.canvasPercent}% (chrome ${area.chromePx}px in ${area.regions} regions)`);
          assert.ok(area.canvasPercent >= 85, `idle canvas >= 85%, got ${area.canvasPercent}`);
        }
        if (theme === 'light' && viewport.width === 1280) {
          const area = await canvasArea(page);
          console.log(`idle canvas area 1280x800: ${area.canvasPercent}%`);
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

// ---- 04a–d journey: fresh browser, fresh document per attempt ----
class SpuriousReload extends Error {}

async function runJourney(browser, docId) {
  let page = null;
  try {
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(String(error));
      console.log('PAGEERROR:', String(error).slice(0, 500));
    });
    const t0 = Date.now();
    const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) console.log(`${stamp()} FRAME NAVIGATED:`, frame.url());
    });
    page.on('load', () => console.log(`${stamp()} PAGE LOAD EVENT`));
    let seenNavs = 0;
    let expectedNavs = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) seenNavs += 1;
    });
    function checkStable(label) {
      if (seenNavs > expectedNavs) {
        throw new SpuriousReload(`spurious reload during ${label} (${seenNavs - expectedNavs} extra navigation)`);
      }
    }
    async function scriptedReload() {
      expectedNavs += 1;
      await page.reload();
    }
    await page.addInitScript(() => localStorage.setItem('openflowkit-theme', 'light'));
    await openDocument(page, docId);
    await page.waitForTimeout(2000);
    expectedNavs = seenNavs;
    const canvas = page.getByTestId('v2-canvas');
    await canvas.click({ position: { x: 720, y: 450 } });

    // 04a: no-op-safe edit cycles pending → saved; reload shows the same doc.
    await page.keyboard.press('r');
    await page.mouse.move(500, 350);
    await page.mouse.down();
    await page.mouse.move(660, 422, { steps: 5 });
    await page.mouse.up();
    let current = await state(page);
    assert.equal(current.nodes.length, 1, 'rectangle created and selected');
    assert.deepEqual(current.selectedNodes, current.nodes, 'result is selected');
    await page.keyboard.press('ControlOrMeta+z');
    current = await state(page);
    assert.equal(current.nodes.length, 0, 'undo removes creation');
    await waitSaved(page, checkStable);
    current = await state(page);
    assert.equal(current.save, 'saved', 'save status reaches saved after durable commit');
    const emptyDoc = await documentJson(page);
    await scriptedReload();
    await waitForEditor(page);
    assert.equal(await waitClean(page, checkStable), 'clean', 'fresh reload settles clean, not dirty');
    assert.deepEqual(await documentJson(page), emptyDoc, 'reload shows the same document');
    console.log('04a PASS: route/shell/session/autosave/camera, reload equality');

    // ---- 04b: create, select, move, semantic tree ----
    checkStable('04a');
    await page.getByTestId('v2-canvas').click({ position: { x: 720, y: 800 } });
    await page.keyboard.press('r');
    await page.mouse.move(480, 330);
    await page.mouse.down();
    await page.mouse.move(640, 402, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.press('o');
    await page.mouse.move(780, 300);
    await page.mouse.down();
    await page.mouse.move(940, 372, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.press('t');
    await page.mouse.move(480, 500);
    await page.mouse.down();
    await page.mouse.up();
    // Text create opens the editor at once; the tool reverts to select.
    await page.getByLabel('Edit node label').waitFor();
    await page.keyboard.press('Escape');
    current = await state(page);
    assert.equal(current.nodes.length, 3, 'three shapes created');
    assert.equal(current.tool, 'select', 'tool reverts to select after a create');
    const [firstId, secondId] = current.nodes;
    // Marquee-select the first two.
    await page.keyboard.press('v');
    await page.mouse.move(440, 260);
    await page.mouse.down();
    await page.mouse.move(980, 440, { steps: 8 });
    await page.mouse.up();
    current = await state(page);
    assert.deepEqual(current.selectedNodes.sort(), [firstId, secondId].sort(), 'marquee selects 2');
    await page.getByRole('toolbar', { name: 'Selection actions' }).waitFor();
    // Move via drag on the first node (camera-independent: assert the delta).
    const firstRect = await page.evaluate((nodeId) => window.__V2__.getNodeRect(nodeId), firstId);
    const beforeMove = await documentJson(page);
    const beforeFirst = beforeMove.pages[0].nodes.find((node) => node.id === firstId);
    await page.mouse.move(firstRect.x + firstRect.width / 2, firstRect.y + firstRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(firstRect.x + firstRect.width / 2 + 60, firstRect.y + firstRect.height / 2 + 30, { steps: 5 });
    await page.mouse.up();
    const movedDoc = await documentJson(page);
    const movedFirst = movedDoc.pages[0].nodes.find((node) => node.id === firstId);
    const dx = movedFirst.transform.translation.x - beforeFirst.transform.translation.x;
    const dy = movedFirst.transform.translation.y - beforeFirst.transform.translation.y;
    assert.ok(dx > 30 && dy > 15, `drag moves selection (got ${dx},${dy})`);
    // Undo x2, redo x2.
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+z');
    current = await state(page);
    assert.equal(current.nodes.length, 2, 'undo x2 removes move and third shape');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    current = await state(page);
    assert.equal(current.nodes.length, 3, 'redo x2 restores');
    assert.deepEqual(await documentJson(page), movedDoc, 'redo restores identical geometry');
    // Tree and canvas agree on selected IDs.
    checkStable('04b-move');
    await page.keyboard.press('l');
    const treeSelected = await page
      .locator('[role="treeitem"][aria-selected="true"]')
      .getAttribute('data-id');
    assert.ok(
      current.selectedNodes.map((id) => `node:${id}`).includes(treeSelected),
      `tree mirrors canvas selection (tree=${treeSelected} canvas=${current.selectedNodes})`
    );
    // Let the panel animation and software compositor settle before capture.
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${EVIDENCE}/04b-selection-tree.png` });
    console.log('04b PASS: create/select/move/tree agreement');
    // ---- 04c: in-place text editing ----
    checkStable('04b');
    await page.keyboard.press('Escape');
    current = await state(page);
    const labelNode = current.nodes[0];
    const labelRect = await page.evaluate((nodeId) => window.__V2__.getNodeRect(nodeId), labelNode);
    const labelPoint = {
      x: labelRect.x + labelRect.width / 2,
      y: labelRect.y + labelRect.height / 2,
    };
    await page.mouse.move(labelPoint.x, labelPoint.y);
    await page.mouse.down();
    await page.mouse.up();
    current = await state(page);
    assert.ok(current.selectedNodes.includes(labelNode), 'click selects the label node');
    const beforeLabel = (await documentJson(page)).pages[0].nodes.find((node) => node.id === labelNode).content.label;
    await page.mouse.dblclick(labelPoint.x, labelPoint.y);
    const editor = page.getByLabel('Edit node label');
    await editor.waitFor();
    await editor.fill('Checkout flow');
    await page.keyboard.press('Escape');
    assert.ok((await editor.count()) === 0, 'Escape closes the overlay');
    let labelNow = (await documentJson(page)).pages[0].nodes.find((node) => node.id === labelNode).content.label;
    assert.equal(labelNow, beforeLabel, 'Escape restores pre-edit text');
    await page.keyboard.press('F2');
    await page.getByLabel('Edit node label').fill('Checkout flow');
    await page.keyboard.press('Enter');
    labelNow = (await documentJson(page)).pages[0].nodes.find((node) => node.id === labelNode).content.label;
    assert.equal(labelNow, 'Checkout flow', 'Enter commits one history entry');
    await page.keyboard.press('ControlOrMeta+z');
    labelNow = (await documentJson(page)).pages[0].nodes.find((node) => node.id === labelNode).content.label;
    assert.equal(labelNow, beforeLabel, 'undo restores original label');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    labelNow = (await documentJson(page)).pages[0].nodes.find((node) => node.id === labelNode).content.label;
    assert.equal(labelNow, 'Checkout flow', 'redo re-applies label');
    console.log('04c PASS: text edit/Escape/commit/undo/redo');

    // ---- 04d: bound connector, full journey ----
    checkStable('04c');
    current = await state(page);
    const sourceId = current.nodes[0];
    const targetId = current.nodes[1];
    const sourceRect = await page.evaluate((nodeId) => window.__V2__.getNodeRect(nodeId), sourceId);
    const targetRect = await page.evaluate((nodeId) => window.__V2__.getNodeRect(nodeId), targetId);
    await page.keyboard.press('a');
    await page.mouse.move(sourceRect.x + sourceRect.width / 2, sourceRect.y + sourceRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetRect.x + targetRect.width / 2, targetRect.y + targetRect.height / 2, { steps: 8 });
    await page.mouse.up();
    current = await state(page);
    assert.equal(current.connectors.length, 1, 'drag creates a bound connector');
    let journey = await documentJson(page);
    const edge = journey.pages[0].connectors[0];
    assert.equal(edge.source.nodeId, sourceId, 'connector source is bound');
    assert.equal(edge.target.nodeId, targetId, 'connector target is bound');
    assert.equal(edge.appearance.markerEnd, 'arrow', 'connector has an arrowhead');
    assert.equal((await state(page)).tool, 'select', 'tool reverts after connect');
    // Free arrow: drag on empty canvas, then delete it.
    await page.keyboard.press('a');
    await page.mouse.move(300, 700);
    await page.mouse.down();
    await page.mouse.move(420, 760, { steps: 5 });
    await page.mouse.up();
    current = await state(page);
    assert.equal(current.connectors.length, 2, 'drag on empty canvas creates a free arrow');
    const free = (await documentJson(page)).pages[0].connectors[1];
    assert.equal(free.source.nodeId, null, 'free arrow source is unbound');
    assert.ok(free.target.point, 'free arrow target keeps a page point');
    await page.keyboard.press('Delete');
    assert.equal((await state(page)).connectors.length, 1, 'delete removes the selected arrow');
    // Moving a bound shape keeps the binding.
    await page.keyboard.press('v');
    await page.mouse.move(sourceRect.x + sourceRect.width / 2, sourceRect.y + sourceRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceRect.x + sourceRect.width / 2 + 40, sourceRect.y + sourceRect.height / 2, { steps: 5 });
    await page.mouse.up();
    journey = await documentJson(page);
    assert.equal(journey.pages[0].connectors[0].source.nodeId, sourceId, 'binding survives move');
    // Undo/redo the move, save, reload, assert equality.
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await waitSaved(page, checkStable);
    const beforeReload = await documentJson(page);
    await scriptedReload();
    await waitForEditor(page);
    assert.equal(await waitClean(page, checkStable), 'clean', 'post-reload state is clean');
    assert.deepEqual(await documentJson(page), beforeReload, 'document equality across reload');
    // SVG export contains the label text.
    checkStable('04d');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Download SVG' }).click();
    const download = await downloadPromise;
    const svgPath = `${EVIDENCE}/04d-export.svg`;
    await download.saveAs(svgPath);
    const svg = fs.readFileSync(svgPath, 'utf8');
    assert.ok(svg.includes('Checkout flow'), 'SVG contains the label text');
    await page.screenshot({ path: `${EVIDENCE}/04d-journey.png` });
    console.log('04d PASS: connect/move/undo/redo/save/reload/SVG');

    // ---- keyboard-only variant ----
    await page.getByTestId('v2-canvas').click({ position: { x: 720, y: 800 } });
    await page.keyboard.press('r');
    assert.equal((await state(page)).tool, 'rectangle', 'tool key R');
    await page.keyboard.press('t');
    assert.equal((await state(page)).tool, 'text', 'tool key T');
    await page.keyboard.press('Escape');
    assert.equal((await state(page)).tool, 'select', 'Escape disarms the tool');
    // Wheel pans; ⌘/Ctrl+wheel zooms.
    const zoomBefore = await page.getByRole('button', { name: /^Zoom \d+%$/ }).textContent();
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 120);
    assert.equal(await page.getByRole('button', { name: /^Zoom \d+%$/ }).textContent(), zoomBefore, 'plain wheel pans, not zooms');
    await page.locator('.ofk-v2-viewport canvas').dispatchEvent('wheel', { deltaY: -120, clientX: 720, clientY: 450, ctrlKey: true, bubbles: true });
    await page.waitForTimeout(50); // camera state settles on the next animation frame
    assert.notEqual(await page.getByRole('button', { name: /^Zoom \d+%$/ }).textContent(), zoomBefore, 'ctrl+wheel zooms');
    await page.keyboard.press('ControlOrMeta+a');
    current = await state(page);
    assert.ok(current.selectedNodes.length >= 3, 'select all via keyboard');
    await page.keyboard.press('F2');
    await page.getByLabel('Edit node label').fill('Keyboard label');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ControlOrMeta+z');
    await page.keyboard.press('ControlOrMeta+Shift+z');
    console.log('keyboard PASS: tool keys, select-all, F2, Escape, undo/redo');
    checkStable('keyboard');
    assert.deepEqual(errors, [], 'no page errors during the journey');
  } finally {
    if (page) await page.close().catch(() => undefined);
  }
}

{
  const browser = await launchBrowser();
  try {
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const docId = `v2-04-journey-${RUN_ID}-a${attempt}`;
      try {
        await runJourney(browser, docId);
        break;
      } catch (error) {
        if (error instanceof SpuriousReload && attempt < 3) {
          console.log(`attempt ${attempt}: ${error.message} — restarting on a fresh document`);
          continue;
        }
        throw error;
      }
    }
    console.log('V2-04 GATE PASS');
  } finally {
    await browser.close();
  }
}
