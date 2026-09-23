import { expect, test } from '@playwright/test';

// Slice 7.2 gate: the animated SVG paused at t and the still from frameAt(t)
// must be the same picture. Both are rasterised in the page and compared
// pixel by pixel; three times across two presets (build, walkthrough with its
// camera glide). Slice 7.8 adds the other half of the same law: the canvas
// frame the encoder paints must be that same picture too, at 1080p.
// Run headed: npm run e2e:headed -- e2e/motion-svg.spec.ts

const DSL = `%% ofk 1
flowchart down

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
  API -> Store [cylinder, red]
  Store -> Worker [rounded, violet]
`;

// The painter and scrubber checks below are about plain shapes: icons from
// labels would turn Client/API/Store into icon cards, which take the SVG path.
const DIAGRAM = `%% ofk 1
flowchart down
icons: off

  Client -> API
  API -> Cache
  API -> Store
`;

const MARKED = `%% ofk 1
flowchart down
icons: off

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
  API -> Store [cylinder, red]
  Store -> Worker [rounded, violet] : done [head: arrow]
`;

const SHAPES = `%% ofk 1
flowchart
icons: off

Decision [diamond]
Ledger [cylinder, blue]
Launch [star, orange, bold]
Reply [speech, green]
Done [check-circle]
Goal [target]
Grouping [brace]
Decision -> Ledger
Ledger -> Launch : ship
Launch -> Reply
Reply -> Done
Done -> Goal
`;

const CHART = `%% ofk 1
chart bar
title: Monthly revenue

Revenue: Jan 12, Feb 19, Mar 9, Apr 22, May 17
Costs: Jan 8, Feb 9, Mar 7, Apr 11, May 12
`;

type Preset = 'build' | 'walkthrough' | 'pulse';
interface MotionExport {
  durationMs: number;
  steps: number;
  animatedSvg: string;
  stillAt: (tMs: number) => string;
}
interface V2Api {
  getMotionExport(preset?: Preset): MotionExport | null;
  getMotionFrameCanvas(tMs: number, preset?: Preset): string | null;
  getState(): { nodes: string[] };
}

/**
 * Freeze a clip at `t` by shifting every animation's delay and pausing it, so
 * the markup renders at exactly that time inside an `<img>`. The regex only
 * matches the exporter's own shorthand; if that format changes the check
 * fails loudly (the animations would play from zero instead).
 */
function freezeAt(markup: string, tMs: number): string {
  return markup.replace(
    /animation:(\S+) (\S+)ms (\S+) (-?[\d.]+)ms (\S+) (both|none|forwards|backwards)/g,
    (_, name, duration, timing, delay, iteration, fill) =>
      `animation:${name} ${duration}ms ${timing} ${Number(delay) - tMs}ms ${iteration} ${fill} paused`,
  );
}

/** Rasterise two SVG strings in the page and count pixels differing by > 16. */
async function diffPixels(page: import('@playwright/test').Page, first: string, second: string) {
  return page.evaluate(async ([a, b]) => {
    const raster = async (markup: string) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
      await image.decode();
      const width = Math.round(Number(/\bwidth="([\d.]+)"/.exec(markup)?.[1] ?? image.naturalWidth));
      const height = Math.round(Number(/\bheight="([\d.]+)"/.exec(markup)?.[1] ?? image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
      return { data: canvas.getContext('2d')!.getImageData(0, 0, width, height).data, pixels: width * height };
    };
    const left = await raster(a as string);
    const right = await raster(b as string);
    if (left.pixels !== right.pixels) return 1;
    let differing = 0;
    for (let index = 0; index < left.data.length; index += 4) {
      const delta = Math.max(
        Math.abs(left.data[index]! - right.data[index]!),
        Math.abs(left.data[index + 1]! - right.data[index + 1]!),
        Math.abs(left.data[index + 2]! - right.data[index + 2]!),
        Math.abs(left.data[index + 3]! - right.data[index + 3]!),
      );
      if (delta > 16) differing += 1;
    }
    return differing / left.pixels;
  }, [first, second] as const);
}

async function generate(page: import('@playwright/test').Page, source: string, expectedNodes: number) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="v2-canvas"]');
  await page.getByRole('toolbar', { name: 'Workspace', exact: true }).getByRole('button', { name: 'Diagram as code' }).click();
  const editor = page.getByRole('textbox', { name: 'Diagram source' });
  await editor.fill(source);
  await editor.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
  await expect.poll(async () => page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    return api?.getState().nodes.length ?? 0;
  })).toBeGreaterThan(expectedNodes);
  await page.getByRole('button', { name: 'Close panel' }).click();
}

test('animated SVG and the still match at every time', async ({ page }) => {
  await generate(page, DSL, 5);

  for (const preset of ['build', 'walkthrough'] as const) {
    const motion = await page.evaluate((name) => {
      const api = (window as unknown as { __V2__?: V2Api }).__V2__;
      const exported = api?.getMotionExport(name);
      if (!exported) return null;
      return { durationMs: exported.durationMs, steps: exported.steps, animatedSvg: exported.animatedSvg };
    }, preset);
    expect(motion).not.toBeNull();
    expect(motion!.steps).toBeGreaterThan(3);
    // A real animation: keyframes, per-element animations, reduced-motion escape.
    expect(motion!.animatedSvg).toContain('@keyframes');
    expect(motion!.animatedSvg).toContain('prefers-reduced-motion');
    expect(motion!.animatedSvg).toContain('class="ofk-anim"');
    if (preset === 'walkthrough') expect(motion!.animatedSvg).toContain('@keyframes ofk-camera');

    for (const fraction of [0.15, 0.5, 0.85]) {
      const at = Math.round(motion!.durationMs * fraction);
      const still = await page.evaluate(([time, name]) => {
        const api = (window as unknown as { __V2__?: V2Api }).__V2__;
        return api?.getMotionExport(name as Preset)?.stillAt(time as number) ?? '';
      }, [at, preset] as const);
      const ratio = await diffPixels(page, freezeAt(motion!.animatedSvg, at), still);
      // Antialiasing is the only difference allowed; a wrong state or camera
      // shows up an order of magnitude above this.
      expect(ratio, `${preset} at ${at}ms`).toBeLessThan(0.01);
    }
  }
});

/**
 * The canvas frame and the SVG still, both rasterised into the frame's own
 * 1080p pixels. The SVG goes through the encoder's exact path: sized to the
 * frame, drawn once. Anything above antialiasing noise means the renderer and
 * the file disagree about a state, a colour or a position.
 */
async function diffCanvasAndStill(
  page: import('@playwright/test').Page, canvasUrl: string, still: string,
): Promise<number> {
  return page.evaluate(async ([frameUrl, markup]) => {
    const load = async (src: string, width?: number, height?: number) => {
      const image = new Image();
      if (width && height) { image.width = width; image.height = height; }
      image.src = src;
      await image.decode();
      return image;
    };
    const frame = await load(frameUrl as string);
    const width = frame.naturalWidth;
    const height = frame.naturalHeight;
    const stillImage = await load(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup as string)}`, width, height,
    );
    const pixels = (image: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, width, height);
      return context.getImageData(0, 0, width, height).data;
    };
    const left = pixels(frame);
    const right = pixels(stillImage);
    let differing = 0;
    for (let index = 0; index < left.length; index += 4) {
      const delta = Math.max(
        Math.abs(left[index]! - right[index]!),
        Math.abs(left[index + 1]! - right[index + 1]!),
        Math.abs(left[index + 2]! - right[index + 2]!),
        Math.abs(left[index + 3]! - right[index + 3]!),
      );
      if (delta > 16) differing += 1;
    }
    return differing / (width * height);
  }, [canvasUrl, still] as const);
}

test('the canvas frame and the SVG still are the same picture', async ({ page }) => {
  test.setTimeout(240_000);
  const fixtures = [
    ['plain', MARKED, 5],
    ['shape library', SHAPES, 6],
  ] as const;
  for (const [name, source, nodes] of fixtures) {
    await generate(page, source, nodes);
    for (const preset of ['build', 'walkthrough', 'pulse'] as const) {
      const motion = await page.evaluate((target) => {
        const api = (window as unknown as { __V2__?: V2Api }).__V2__;
        const exported = api?.getMotionExport(target as Preset);
        return exported ? { durationMs: exported.durationMs, steps: exported.steps } : null;
      }, preset);
      expect(motion, name).not.toBeNull();
      for (const fraction of [0.15, 0.5, 0.85]) {
        const at = Math.round(motion!.durationMs * fraction);
        const [canvasUrl, still] = await page.evaluate(([time, target]) => {
          const api = (window as unknown as { __V2__?: V2Api }).__V2__;
          return [
            api?.getMotionFrameCanvas(time as number, target as Preset) ?? '',
            api?.getMotionExport(target as Preset)?.stillAt(time as number) ?? '',
          ] as const;
        }, [at, preset] as const);
        expect(canvasUrl, `${name} ${preset} produced no canvas frame`).not.toBe('');
        const ratio = await diffCanvasAndStill(page, canvasUrl, still);
        // Two per cent: font metrics and antialiasing are the only allowed
        // differences; a wrong state, colour or position is an order above.
        expect(ratio, `${name} ${preset} at ${at}ms`).toBeLessThan(0.02);
      }
    }
  }
});

test('a chart page is marked as a fallback frame and still exports', async ({ page }) => {
  // The frame renderer covers plain nodes, containers and connectors; a chart
  // puts every frame back on the SVG raster, and the hook says so.
  await generate(page, CHART, 0);
  const fallback = await page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    return {
      canvas: api?.getMotionFrameCanvas(0, 'build') ?? null,
      still: api?.getMotionExport('build')?.stillAt(0) ?? '',
    };
  });
  expect(fallback.canvas).toBeNull();
  expect(fallback.still).toContain('data-node-kind="chart"');
});

test('the still follows the timeline and the preview can seek', async ({ page }) => {
  await generate(page, DIAGRAM, 2);

  const stills = await page.evaluate(() => {
    const api = (window as unknown as { __V2__?: V2Api }).__V2__;
    const exported = api?.getMotionExport('build');
    if (!exported) return null;
    return {
      start: exported.stillAt(0),
      middle: exported.stillAt(Math.round(exported.durationMs * 0.5)),
      end: exported.stillAt(exported.durationMs),
    };
  });
  expect(stills).not.toBeNull();
  // The scrubber must visibly change the picture.
  expect(await diffPixels(page, stills!.start, stills!.middle)).toBeGreaterThan(0.01);
  expect(await diffPixels(page, stills!.middle, stills!.end)).toBeGreaterThan(0.001);
  // And the animation ends where the still does.
  expect(await diffPixels(page, stills!.middle, stills!.end)).toBeGreaterThan(0.001);
});
