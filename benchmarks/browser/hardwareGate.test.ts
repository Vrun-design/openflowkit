import { describe, expect, it } from 'vitest';
import {
  evaluateHardwareGate,
  HARDWARE_GATE_SCHEMA_VERSION,
  MIN_HARDWARE_RUNS,
  type HardwareRendererCapture,
} from './hardwareGate';

const SHA = 'a'.repeat(64);
const COMMIT = 'b'.repeat(40);

function capture(renderer: HardwareRendererCapture['renderer']): HardwareRendererCapture {
  return {
    schemaVersion: HARDWARE_GATE_SCHEMA_VERSION,
    renderer,
    git: { commit: COMMIT, dirty: false },
    runner: {
      browserName: 'chromium',
      browserVersion: '145.0.0.0',
      platform: 'darwin',
      architecture: 'arm64',
      viewport: { width: 1440, height: 900 },
      devicePixelRatio: 2,
      hardwareConcurrency: 8,
      webGl: { vendor: 'Apple', renderer: 'ANGLE Metal Renderer: Apple M4' },
    },
    runs: Array.from({ length: MIN_HARDWARE_RUNS }, () => ({
      fixture: { name: 'large-1000', sha256: SHA, nodes: 1_000, edges: 1_500 },
      interaction: { frameP95Ms: 16.7, inputNextFrameP95Ms: 22, framesOver50Ms: 0 },
    })),
  };
}

describe('hardware benchmark gate', () => {
  it('accepts repeated paired evidence from one real-GPU runner', () => {
    expect(evaluateHardwareGate(capture('reactflow'), capture('opencanvas-pixi'))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('rejects software rendering and weak single-run evidence', () => {
    const reactFlow = capture('reactflow');
    const openCanvas = capture('opencanvas-pixi');
    openCanvas.runner.webGl.renderer = 'ANGLE (SwiftShader Device)';
    openCanvas.runs = openCanvas.runs.slice(0, 1);
    const result = evaluateHardwareGate(reactFlow, openCanvas);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('opencanvas-pixi: software WebGL is not hardware evidence');
    expect(result.errors).toContain(`opencanvas-pixi: at least ${MIN_HARDWARE_RUNS} runs are required`);
  });

  it('rejects mismatched commits, runners, and fixture hashes', () => {
    const reactFlow = capture('reactflow');
    const openCanvas = capture('opencanvas-pixi');
    openCanvas.git.commit = 'c'.repeat(40);
    openCanvas.runner.viewport.width = 1280;
    openCanvas.runs[0].fixture.sha256 = 'd'.repeat(64);
    const result = evaluateHardwareGate(reactFlow, openCanvas);
    expect(result.errors).toContain('captures use different commits');
    expect(result.errors).toContain('captures use different browser or hardware runners');
    expect(result.errors).toContain('captures do not contain identical fixture runs');
  });
});
