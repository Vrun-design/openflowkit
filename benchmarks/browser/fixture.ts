import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { BenchmarkFixture, BrowserBenchmarkFixtureName } from './contracts';

export interface LoadedBenchmarkFixture {
  name: BrowserBenchmarkFixtureName;
  path: string;
  sha256: string;
  data: BenchmarkFixture;
}

function assertFixtureShape(
  name: BrowserBenchmarkFixtureName,
  candidate: unknown
): asserts candidate is BenchmarkFixture {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`${name}: fixture must be an object`);
  }

  const fixture = candidate as Partial<BenchmarkFixture>;
  if (!Array.isArray(fixture.nodes) || !Array.isArray(fixture.edges)) {
    throw new Error(`${name}: fixture requires nodes and edges arrays`);
  }
  if (!fixture.metadata) {
    throw new Error(`${name}: fixture metadata is missing`);
  }
  if (fixture.metadata.nodeCount !== fixture.nodes.length) {
    throw new Error(`${name}: metadata node count does not match fixture nodes`);
  }
  if (fixture.metadata.edgeCount !== fixture.edges.length) {
    throw new Error(`${name}: metadata edge count does not match fixture edges`);
  }
}

export function loadBenchmarkFixture(name: BrowserBenchmarkFixtureName): LoadedBenchmarkFixture {
  const fixturePath = path.resolve(process.cwd(), 'benchmarks', 'fixtures', `${name}.json`);
  const source = fs.readFileSync(fixturePath, 'utf8');
  const data: unknown = JSON.parse(source);
  assertFixtureShape(name, data);

  return {
    name,
    path: fixturePath,
    sha256: createHash('sha256').update(source).digest('hex'),
    data,
  };
}
