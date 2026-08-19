export const HARDWARE_GATE_SCHEMA_VERSION = 1;
export const MIN_HARDWARE_RUNS = 5;

export interface HardwareRunnerIdentity {
  browserName: string;
  browserVersion: string;
  platform: string;
  architecture: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  hardwareConcurrency: number;
  webGl: { vendor: string; renderer: string };
}

export interface HardwareFixtureRun {
  fixture: { name: string; sha256: string; nodes: number; edges: number };
  interaction: {
    frameP95Ms: number;
    inputNextFrameP95Ms: number;
    framesOver50Ms: number;
  };
}

export interface HardwareRendererCapture {
  schemaVersion: number;
  renderer: 'reactflow' | 'opencanvas-pixi';
  git: { commit: string; dirty: boolean };
  runner: HardwareRunnerIdentity;
  runs: readonly HardwareFixtureRun[];
}

export interface HardwareGateResult {
  ok: boolean;
  errors: readonly string[];
}

const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|software|lavapipe|softpipe/i;

function runnerFingerprint(runner: HardwareRunnerIdentity): string {
  return JSON.stringify({
    browserName: runner.browserName,
    browserVersion: runner.browserVersion,
    platform: runner.platform,
    architecture: runner.architecture,
    viewport: runner.viewport,
    devicePixelRatio: runner.devicePixelRatio,
    hardwareConcurrency: runner.hardwareConcurrency,
    webGl: runner.webGl,
  });
}

function fixtureKey(run: HardwareFixtureRun): string {
  const { fixture } = run;
  return `${fixture.name}:${fixture.sha256}:${fixture.nodes}:${fixture.edges}`;
}

function validateCapture(capture: HardwareRendererCapture, errors: string[]): void {
  if (capture.schemaVersion !== HARDWARE_GATE_SCHEMA_VERSION) {
    errors.push(`${capture.renderer}: unsupported schema version`);
  }
  if (!/^[a-f0-9]{40}$/.test(capture.git.commit)) {
    errors.push(`${capture.renderer}: invalid git commit`);
  }
  if (capture.git.dirty) errors.push(`${capture.renderer}: capture must use a clean worktree`);
  if (!capture.runner.webGl.vendor || !capture.runner.webGl.renderer) {
    errors.push(`${capture.renderer}: unmasked WebGL identity is required`);
  } else if (SOFTWARE_RENDERER_PATTERN.test(capture.runner.webGl.renderer)) {
    errors.push(`${capture.renderer}: software WebGL is not hardware evidence`);
  }
  if (capture.runs.length < MIN_HARDWARE_RUNS) {
    errors.push(`${capture.renderer}: at least ${MIN_HARDWARE_RUNS} runs are required`);
  }
  for (const [index, run] of capture.runs.entries()) {
    const prefix = `${capture.renderer}.runs[${index}]`;
    if (!/^[a-f0-9]{64}$/.test(run.fixture.sha256)) errors.push(`${prefix}: invalid fixture hash`);
    if (run.fixture.nodes <= 0 || run.fixture.edges < 0) errors.push(`${prefix}: invalid fixture size`);
    for (const [name, value] of Object.entries(run.interaction)) {
      if (!Number.isFinite(value) || value < 0) errors.push(`${prefix}.${name}: invalid metric`);
    }
  }
}

export function evaluateHardwareGate(
  reactFlow: HardwareRendererCapture,
  openCanvas: HardwareRendererCapture
): HardwareGateResult {
  const errors: string[] = [];
  validateCapture(reactFlow, errors);
  validateCapture(openCanvas, errors);
  if (reactFlow.renderer !== 'reactflow') errors.push('first capture must be React Flow');
  if (openCanvas.renderer !== 'opencanvas-pixi') errors.push('second capture must be OpenCanvas');
  if (reactFlow.git.commit !== openCanvas.git.commit) errors.push('captures use different commits');
  if (runnerFingerprint(reactFlow.runner) !== runnerFingerprint(openCanvas.runner)) {
    errors.push('captures use different browser or hardware runners');
  }
  const reactFlowFixtures = reactFlow.runs.map(fixtureKey).sort();
  const openCanvasFixtures = openCanvas.runs.map(fixtureKey).sort();
  if (JSON.stringify(reactFlowFixtures) !== JSON.stringify(openCanvasFixtures)) {
    errors.push('captures do not contain identical fixture runs');
  }
  return { ok: errors.length === 0, errors };
}
