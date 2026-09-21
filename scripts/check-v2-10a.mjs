import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// V2-10a gate: agent proposal → review → apply as one agent transaction → undo;
// stale refusal; flag-off inertness. Run against the VITE_V2_EDITOR=1
// VITE_V2_AI=1 build (V2_BASE_URL) and, for the last block, a VITE_V2_AI-off
// build on V2_OFF_BASE_URL (skipped when unset).
const base = process.env.V2_BASE_URL ?? 'http://127.0.0.1:4191';
const offBase = process.env.V2_OFF_BASE_URL ?? null;
const evidence = 'docs/evidence/v2-10a';
fs.mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const state = () => page.evaluate(() => window.__V2__.getState());
const doc = () => page.evaluate(() => window.__V2__.getDocument());
const proposal = () => page.evaluate(() => window.__V2__.getProposal());
const diag = () => page.evaluate(() => window.__V2__.getRenderDiagnostics());
const rect = (id) => page.evaluate((id) => window.__V2__.getNodeRect(id), id);
async function createRect(x, y, count) {
  await page.keyboard.press('Escape'); // a selected shape would take 'r' as text (V2-05e)
  await page.keyboard.press('r');
  await page.mouse.click(x, y);
  await page.waitForFunction((count) => window.__V2__.getState().nodes.length === count, count);
}
async function request(intent) {
  await page.getByRole('button', { name: intent }).click();
  await page.waitForFunction(() => ['ready', 'failed'].includes(window.__V2__.getProposal().phase));
  const result = await proposal();
  assert.equal(result.phase, 'ready', result.error ?? 'proposal must be ready');
  return result;
}
try {
  await page.goto(`${base}/#/v2/agent-${Date.now()}`);
  await page.waitForFunction(() => window.__V2__?.getState());
  await page.locator('canvas').waitFor();
  await page.getByTestId('v2-canvas').focus();
  await createRect(400, 400, 1);
  await createRect(400, 600, 2);
  await page.mouse.click(400, 400);
  const [first] = (await state()).nodes;
  assert.deepEqual((await state()).selectedNodes, [first]);

  // 1. Open with ⌘J, request, ghost visible.
  await page.keyboard.press('Meta+j');
  await page.getByRole('region', { name: 'Agent' }).or(page.locator('aside[aria-label="Agent"]')).first().waitFor();
  const ready = await request('Add a step after the selection');
  assert.equal(ready.changeIds.length, 2);
  assert.equal(ready.baseRevision, (await state()).revision);
  assert.deepEqual(Object.values(ready.decisions), ['accepted', 'accepted']);
  await page.waitForFunction(() => window.__V2__.getRenderDiagnostics().proposalPreviewVisible === true);
  await page.getByRole('listitem').first().hover();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${evidence}/review.png` });

  // 2. Reject the connector, apply once, undo restores byte-for-byte.
  const before = await doc();
  const revisionBefore = (await state()).revision;
  await page.getByRole('listitem').nth(1).getByRole('button', { name: 'Reject' }).click();
  assert.equal((await proposal()).decisions[ready.changeIds[1]], 'rejected');
  const applyButton = page.getByRole('button', { name: /^Apply \(1\)$/ });
  await applyButton.dblclick();
  await page.waitForFunction(() => window.__V2__.getProposal().phase === 'applied');
  assert.equal((await state()).revision, revisionBefore + 1, 'one proposal = one revision');
  assert.equal((await diag()).proposalPreviewVisible, false, 'ghost clears on apply');
  const applied = await doc();
  assert.equal(applied.pages[0].nodes.length, 3);
  assert.equal(applied.pages[0].connectors.length, 0, 'rejected connector must not apply');
  assert.equal(applied.pages[0].nodes[2].content.label, 'Step 3');
  const announcement = (await page.locator('.sr-only[aria-live]').allTextContents()).join(' ');
  assert.match(announcement, /Agent proposal applied: 1 change\. Press ⌘Z to undo\./);
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press('Meta+z');
  await page.waitForFunction((r) => window.__V2__.getState().revision === r, revisionBefore + 2);
  assert.deepEqual(await doc(), before, 'undo must restore the prior document exactly');
  await page.keyboard.press('Meta+Shift+z');
  await page.waitForFunction((r) => window.__V2__.getState().revision === r, revisionBefore + 3);
  assert.deepEqual(await doc(), applied, 'redo must restore the agent transaction');

  // 3. Stale: request, move a shape by mouse, apply is refused, re-request works.
  await page.mouse.click(400, 400);
  await request('Add a step after the selection');
  const bounds = await rect(first);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__V2__.getProposal().stale === true);
  const staleRevision = (await state()).revision;
  assert.equal((await diag()).proposalPreviewVisible, false, 'ghost clears when stale');
  await page.locator('.ofk-review').getByText(/Document changed since this proposal/).waitFor();
  await page.screenshot({ path: `${evidence}/stale.png` });
  assert.ok(await page.getByRole('button', { name: /^Apply \(/ }).isDisabled(), 'stale apply must be disabled');
  assert.equal((await state()).revision, staleRevision, 'stale proposal must not commit');
  await page.mouse.click(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 30);
  const fresh = await request('Add a step after the selection');
  assert.equal(fresh.baseRevision, staleRevision);
  assert.equal((await proposal()).stale, false);

  // Escape chain: selection clears first, then the panel closes.
  await page.getByTestId('v2-canvas').focus();
  await page.keyboard.press('Escape');
  assert.deepEqual((await state()).selectedNodes, []);
  await page.keyboard.press('Escape');
  await page.locator('aside[aria-label="Agent"]').waitFor({ state: 'detached' });
  assert.deepEqual(errors, []);

  // 5. Flag off: no entry point, ⌘J inert.
  if (offBase) {
    await page.goto(`${offBase}/#/v2/agent-off-${Date.now()}`);
    await page.waitForFunction(() => window.__V2__?.getState());
    await page.locator('canvas').waitFor();
    assert.equal(await page.getByTestId('v2-agent-toggle').count(), 0, 'flag off must hide the Agent button');
    await page.getByTestId('v2-canvas').focus();
    await page.keyboard.press('Meta+j');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('aside[aria-label="Agent"]').count(), 0, '⌘J must be inert with the flag off');
    assert.equal((await proposal()).phase, 'idle', 'test API stays read-only and idle with the flag off');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${evidence}/result.json`, JSON.stringify({ pass: true, flagOffChecked: offBase !== null, errors }, null, 2));
  console.log(`V2-10a browser check passed${offBase ? ' (flag-off checked)' : ' (flag-off skipped: set V2_OFF_BASE_URL)'}`);
} catch (error) {
  await page.screenshot({ path: `${evidence}/failure.png` });
  console.error(errors);
  throw error;
} finally { await browser.close(); }
