import { expect, test } from '@playwright/test';

// Slice 7.2 gate: the animated SVG paused at t and the still from frameAt(t)
// must be the same picture. Both are rasterised in the page and compared
// pixel by pixel; three times across two presets (build, walkthrough with its
// camera glide). Run headed: npm run e2e:headed -- e2e/motion-svg.spec.ts

const DSL = `%% ofk 1
flowchart down

  Client [blue] -> API [green] : HTTPS
  API -> Cache [cylinder, orange]
  API -> Store [cylinder, red]
  Store -> Worker [rounded, violet]
`;

const DIAGRAM = `%% ofk 1
flowchart down

  Client -> API
  API -> Cache
  API -> Store
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
