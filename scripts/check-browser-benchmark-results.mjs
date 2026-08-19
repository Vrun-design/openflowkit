import fs from 'node:fs';
import path from 'node:path';

const RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks',
  'browser',
  'results',
  'reactflow-baseline.latest.json'
);
const PIXI_RESULT_PATH = path.resolve(
  process.cwd(),
  'benchmarks',
  'browser',
  'results',
  'pixi-spike.latest.json'
);
const EXPECTED_FIXTURES = new Map([
  ['small-100', { nodes: 100, edges: 150 }],
  ['medium-300', { nodes: 300, edges: 450 }],
  ['large-1000', { nodes: 1000, edges: 1500 }],
]);

function fail(message) {
  console.error(`browser benchmark check failed: ${message}`);
  process.exit(1);
}

function assertFiniteMetric(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(`${label} must be a finite non-negative number`);
  }
}

function checkReactFlowResult() {
  if (!fs.existsSync(RESULT_PATH)) {
    fail(`result not found: ${RESULT_PATH}`);
  }

  const payload = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf8'));
  if (payload.schemaVersion !== 1) {
    fail(`unsupported schema version: ${payload.schemaVersion}`);
  }
  if (payload.renderer !== 'reactflow' || payload.appMode !== 'production-preview') {
    fail('result must describe the React Flow production preview baseline');
  }
  if (!Array.isArray(payload.results) || payload.results.length !== EXPECTED_FIXTURES.size) {
    fail(`expected ${EXPECTED_FIXTURES.size} fixture results`);
  }

  for (const result of payload.results) {
    const expected = EXPECTED_FIXTURES.get(result.fixture?.name);
    if (!expected) {
      fail(`unexpected fixture: ${result.fixture?.name}`);
    }
    if (result.fixture.nodes !== expected.nodes || result.fixture.edges !== expected.edges) {
      fail(`${result.fixture.name}: fixture counts do not match the reference contract`);
    }
    if (!/^[a-f0-9]{64}$/.test(result.fixture.sha256 ?? '')) {
      fail(`${result.fixture.name}: invalid fixture sha256`);
    }

    assertFiniteMetric(result.coldImport?.totalInteractiveMs, `${result.fixture.name}.coldImport`);
    assertFiniteMetric(result.warmImport?.totalInteractiveMs, `${result.fixture.name}.warmImport`);
    assertFiniteMetric(
      result.interaction?.frameTimes?.p95,
      `${result.fixture.name}.interaction.frameTimes.p95`
    );
    assertFiniteMetric(
      result.interaction?.inputNextFrame?.p95,
      `${result.fixture.name}.interaction.inputNextFrame.p95`
    );
    if (!Array.isArray(result.interaction?.samples?.frameTimesMs)) {
      fail(`${result.fixture.name}: raw interaction frame samples are missing`);
    }
    if (!Array.isArray(result.interaction?.samples?.inputNextFrameLatenciesMs)) {
      fail(`${result.fixture.name}: raw input-latency samples are missing`);
    }
    if (result.budgetStatus?.rendererWorkP95 !== 'not-measured') {
      fail(
        `${result.fixture.name}: renderer work must remain trace-measured, not inferred from rAF`
      );
    }
  }

  console.log(`browser benchmark check passed: ${RESULT_PATH}`);
}

function checkPixiResult() {
  if (!fs.existsSync(PIXI_RESULT_PATH)) {
    fail(`result not found: ${PIXI_RESULT_PATH}`);
  }
  const payload = JSON.parse(fs.readFileSync(PIXI_RESULT_PATH, 'utf8'));
  if (
    payload.schemaVersion !== 1 ||
    payload.renderer !== 'pixi.js@8.18.1-webgl' ||
    payload.appMode !== 'production-preview'
  ) {
    fail('Pixi result metadata does not match the locked spike contract');
  }
  if (!Array.isArray(payload.results) || payload.results.length !== 3) {
    fail('Pixi result must contain the 100, 300, and 1,000-node fixtures');
  }
  for (const [index, result] of payload.results.entries()) {
    const expectedNodes = [100, 300, 1_000][index];
    if (result.nodeCount !== expectedNodes || result.connectorCount !== expectedNodes - 1) {
      fail(`Pixi fixture ${index}: scene counts do not match the reference contract`);
    }
    assertFiniteMetric(result.loadMs, `pixi.${expectedNodes}.loadMs`);
    assertFiniteMetric(result.frameTimes?.p95, `pixi.${expectedNodes}.frameTimes.p95`);
    assertFiniteMetric(result.inputNextFrame?.p95, `pixi.${expectedNodes}.inputNextFrame.p95`);
    if (!Array.isArray(result.samples?.frameTimesMs)) {
      fail(`pixi.${expectedNodes}: raw frame samples are missing`);
    }
  }
  console.log(`browser benchmark check passed: ${PIXI_RESULT_PATH}`);
}

checkReactFlowResult();
checkPixiResult();
