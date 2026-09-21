// Slice 1.1 — feel probe. Headed Chromium only: headless misses trackpad drops.
// Measures, on a ~500-node canvas, with real trusted pointer events:
//   1. pointer→paint latency p50/p95 during a 3 s drag (in-page handler→2×rAF,
//      plus the event-timing PerformanceObserver as a cross-check),
//   2. dropped frames over that 3 s drag (rAF gaps > 25 ms),
//   3. zoom-anchor drift in px after 20 ctrlKey pinch steps at a fixed anchor,
//   4. wheel deltaMode 0/1 pan response (observation for slice 1.2).
// Prints a table, writes JSON to docs/evidence/feel/<timestamp>.json.
// Targets live in STATE.md. A missed target is a finding, not a failure:
// this script always exits 0 unless the harness itself breaks.
//
// Usage: start the app (npm run dev -- --host 127.0.0.1 --port 4191),
// then:  V2_BASE_URL=http://127.0.0.1:4191 node scripts/feel-probe.mjs
// Repeatability check: run twice on the same build, numbers within 10 %.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = process.env.V2_BASE_URL ?? 'http://127.0.0.1:4191';
const evidence = 'docs/evidence/feel';
fs.mkdirSync(evidence, { recursive: true });

const TARGET_NODES = Number(process.env.FEEL_NODES ?? 500);
const SELECT_ALL = process.env.FEEL_SELECT_ALL !== '0';
const DRAG_MS = 3000;
const MOVE_INTERVAL_MS = 8; // ~120 Hz pointermove bursts
const PINCH_STEPS = 20;
const PINCH_DELTA_Y = -4; // zoomCameraAt: factor exp(0.04) ≈ 1.041/step, ×2.2 total
const DROPPED_GAP_MS = 25; // an rAF interval past this missed its 60 fps budget

const state = (page) => page.evaluate(() => window.__V2__.getState());
const rectOf = (page, id) => page.evaluate((nodeId) => window.__V2__.getNodeRect(nodeId), id);

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function installRecorder(page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="v2-canvas"]');
    const rec = { recording: false, samples: [], frames: [], events: [], longtasks: [] };
    canvas.addEventListener('pointermove', () => {
      if (!rec.recording) return;
      const t = performance.now();
      requestAnimationFrame(() => requestAnimationFrame((tPaint) => {
        if (rec.recording) rec.samples.push(tPaint - t);
      }));
    });
    const tick = (t) => {
      if (rec.recording) rec.frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'pointermove' || entry.name === 'wheel') {
            rec.events.push({ name: entry.name, duration: entry.duration });
          }
        }
      }).observe({ type: 'event', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (rec.recording) rec.longtasks.push(entry.duration);
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch { /* event-timing unsupported: rAF samples are the primary metric */ }
    window.__FEEL__ = rec;
  });
}

async function setRecording(page, on) {
  await page.evaluate((value) => {
    const rec = window.__FEEL__;
    rec.recording = value;
    if (value) { rec.samples = []; rec.frames = []; rec.events = []; rec.longtasks = []; }
  }, on);
}

async function readRecording(page) {
  return page.evaluate(() => ({
    samples: window.__FEEL__.samples,
    frames: window.__FEEL__.frames,
    events: window.__FEEL__.events,
    longtasks: window.__FEEL__.longtasks,
  }));
}

// Fresh doc, one seed node, then select-all + duplicate doubling to ~500 nodes.
async function seedNodes(page, canvas) {
  await page.keyboard.press('r');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width / 2 - 300, box.y + box.height / 2 - 200);
  await page.waitForFunction(() => window.__V2__.getState().nodes.length === 1);
  await page.keyboard.press('Escape');
  let count = 1;
  while (count < TARGET_NODES) {
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+d');
    const next = count * 2;
    await page.waitForFunction((n) => window.__V2__.getState().nodes.length === n, next);
    count = next;
  }
  return count;
}

function printTable(rows) {
  const widths = [rows.reduce((m, r) => Math.max(m, r[0].length), 0),
    rows.reduce((m, r) => Math.max(m, r[1].length), 0)];
  for (const [k, v, verdict] of rows) {
    console.log(`${k.padEnd(widths[0])}  ${v.padEnd(widths[1])}  ${verdict ?? ''}`);
  }
}

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.goto(`${base}/#/d/feel-${Date.now()}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__V2__?.getState());
  const canvas = page.getByTestId('v2-canvas');
  await canvas.waitFor();
  await canvas.focus();
  await installRecorder(page);

  // --- Seed ----------------------------------------------------------------
  const nodeCount = await seedNodes(page, canvas);

  // --- 1+2. Latency + dropped frames over a 3 s drag of all nodes -----------
  if (SELECT_ALL) await page.keyboard.press('ControlOrMeta+a'); // warmup selection
  else {
    const firstId = (await state(page)).nodes[0];
    const firstRect = await rectOf(page, firstId);
    await page.mouse.click(firstRect.x + firstRect.width / 2, firstRect.y + firstRect.height / 2);
  }
  const dragId = (await state(page)).selectedNodes[0];
  const dragRect = await rectOf(page, dragId);
  const startX = dragRect.x + dragRect.width / 2;
  const startY = dragRect.y + dragRect.height / 2;
  const dragDx = 600;
  // Warmup drag so JIT/GC settle before the measured run.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  if (SELECT_ALL) await page.keyboard.press('ControlOrMeta+a');
  await page.mouse.move(startX, startY);
  const diagBefore = await page.evaluate(() => window.__V2__.getRenderDiagnostics());
  await setRecording(page, true);
  const dragStart = Date.now();
  await page.mouse.down();
  // Wall-clock 3 s window: fire moves at ~120 Hz; the app delivers what it can.
  // (A fixed move count would stretch the window when the main thread saturates.)
  let moves = 0;
  const iterMs = [];
  while (Date.now() - dragStart < DRAG_MS) {
    const t0 = Date.now();
    moves += 1;
    await page.mouse.move(startX + (dragDx * (Date.now() - dragStart)) / DRAG_MS, startY);
    iterMs.push(Date.now() - t0);
    await page.waitForTimeout(MOVE_INTERVAL_MS);
  }
  await page.mouse.up();
  const dragMs = Date.now() - dragStart;
  await setRecording(page, false);
  const diagAfter = await page.evaluate(() => window.__V2__.getRenderDiagnostics());
  const renders = diagAfter.renderCount - diagBefore.renderCount;
  const { samples, frames, events, longtasks } = await readRecording(page);
  iterMs.sort((a, b) => a - b);
  const lat = [...samples].sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < frames.length; i++) gaps.push(frames[i] - frames[i - 1]);
  const dropped = gaps.reduce((n, g) => (g > DROPPED_GAP_MS ? n + Math.round(g / 16.667) - 1 : n), 0);
  const eventDur = events.map((e) => e.duration).sort((a, b) => a - b);

  // --- 3. Zoom-anchor drift: node centered at the anchor must stay there -----
  await page.keyboard.press('Escape');
  // Wheel pan only fires over the canvas element (the handler checks the
  // target), so anchor on the canvas box, not the section box.
  const canvasBox = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="v2-canvas"] canvas');
    const r = canvas.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  const anchor = { x: canvasBox.x + canvasBox.width / 2, y: canvasBox.y + canvasBox.height / 2 };
  await page.keyboard.press('r');
  await page.mouse.click(anchor.x, anchor.y);
  await page.waitForFunction((n) => window.__V2__.getState().nodes.length === n, nodeCount + 1);
  await page.keyboard.press('Escape');
  const anchorId = (await state(page)).nodes.at(-1);
  const before = await rectOf(page, anchorId);
  const centerBefore = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
  await page.evaluate(({ ax, ay, steps, deltaY }) => {
    const el = document.querySelector('[data-testid="v2-canvas"] canvas');
    for (let i = 0; i < steps; i++) {
      el.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true, cancelable: true, ctrlKey: true,
        deltaY, deltaMode: 0, clientX: ax, clientY: ay,
      }));
    }
  }, { ax: anchor.x, ay: anchor.y, steps: PINCH_STEPS, deltaY: PINCH_DELTA_Y });
  await page.waitForTimeout(300);
  const after = await rectOf(page, anchorId);
  const centerAfter = { x: after.x + after.width / 2, y: after.y + after.height / 2 };
  const drift = Math.hypot(centerAfter.x - centerBefore.x, centerAfter.y - centerBefore.y);

  // --- 4. Wheel deltaMode observation (no ctrlKey → pan path) ----------------
  // Dispatch on the canvas element: the pan branch requires a canvas target.
  async function panFor(delta) {
    const r0 = await rectOf(page, anchorId);
    await page.evaluate((d) => {
      const el = document.querySelector('[data-testid="v2-canvas"] canvas');
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true, cancelable: true, deltaX: d.dx, deltaY: d.dy,
        deltaMode: d.mode, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
      }));
    }, delta);
    await page.waitForTimeout(200);
    const r1 = await rectOf(page, anchorId);
    return Math.hypot(r1.x - r0.x, r1.y - r0.y);
  }
  const panPixel = await panFor({ dx: 0, dy: 40, mode: 0 });
  const panLine = await panFor({ dx: 0, dy: 3, mode: 1 });

  const result = {
    startedAt: new Date().toISOString(),
    baseUrl: base,
    headed: true,
    nodeCount,
    latencyMs: {
      p50: +percentile(lat, 50).toFixed(2),
      p95: +percentile(lat, 95).toFixed(2),
      samples: lat.length,
      eventTimingSamples: eventDur.length,
      eventTimingP95: eventDur.length ? +percentile(eventDur, 95).toFixed(2) : null,
    },
    drag: {
      windowMs: dragMs, moves, attemptedHz: Math.round(1000 / MOVE_INTERVAL_MS),
      achievedHz: +(moves / (dragMs / 1000)).toFixed(1),
      inputDeliveryMsP50: +percentile(iterMs, 50).toFixed(1),
      frames: frames.length,
      fps: +(frames.length / (dragMs / 1000)).toFixed(1),
      droppedFrames: dropped,
      renders,
      lastRenderMs: +diagAfter.lastRenderDurationMs.toFixed(1),
      longtasks: longtasks.length,
      longtaskMsP50: longtasks.length ? +percentile([...longtasks].sort((a, b) => a - b), 50).toFixed(1) : 0,
      selectedNodes: SELECT_ALL ? nodeCount : 1,
    },
    zoom: {
      pinchSteps: PINCH_STEPS, pinchDeltaY: PINCH_DELTA_Y,
      anchorDriftPx: +drift.toFixed(2),
    },
    wheel: {
      panPixelModePx: +panPixel.toFixed(2),
      panLineModePx: +panLine.toFixed(2),
    },
    targets: {
      p95LatencyMs: { target: `<= 16 @ ${TARGET_NODES} nodes`, pass: percentile(lat, 95) <= 16 },
      droppedFrames: { target: '0 / 3 s drag', pass: dropped === 0 },
      zoomDriftPx: { target: '<= 1', pass: drift <= 1 },
    },
    pageErrors: errors,
  };
  const outPath = `${evidence}/${stamp}.json`;
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

  printTable([
    ['metric', 'value', 'target'],
    [`pointer→paint p50 @ ${nodeCount} nodes`, `${result.latencyMs.p50} ms`, ''],
    [`pointer→paint p95 @ ${nodeCount} nodes`, `${result.latencyMs.p95} ms`,
      result.targets.p95LatencyMs.pass ? 'PASS (≤ 16 ms)' : 'FAIL (> 16 ms)'],
    [`dropped frames / ${(dragMs / 1000).toFixed(1)} s drag`, `${dropped} (${result.drag.fps} fps, ${result.drag.achievedHz} Hz input)`,
      result.targets.droppedFrames.pass ? 'PASS (0)' : 'FAIL (> 0)'],
    [`pixi renders during drag`, `${renders} renders, last ${result.drag.lastRenderMs} ms`, 'observe'],
    [`zoom-anchor drift, ${PINCH_STEPS} pinch steps`, `${result.zoom.anchorDriftPx} px`,
      result.targets.zoomDriftPx.pass ? 'PASS (≤ 1 px)' : 'FAIL (> 1 px)'],
    ['wheel pan, 40 px pixel-mode', `${result.wheel.panPixelModePx} px moved`, 'observe'],
    ['wheel pan, 3-line line-mode', `${result.wheel.panLineModePx} px moved`, 'observe'],
  ]);
  console.log(`wrote ${outPath}`);
  if (errors.length) { console.error('page errors:', errors); process.exitCode = 1; }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
