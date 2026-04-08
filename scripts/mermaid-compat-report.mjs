import mermaid from 'mermaid';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  suppressErrorRendering: true,
});

const SUPPORTED_EDITABLE_FAMILIES = new Set([
  'flowchart',
  'flowchart-v2',
  'stateDiagram',
  'stateDiagram-v2',
  'class',
  'classDiagram',
  'er',
  'erDiagram',
  'mindmap',
  'journey',
  'architecture',
  'architecture-beta',
  'sequence',
  'sequenceDiagram',
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesPath = path.join(__dirname, 'mermaid-compat-fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

function classifyOfficialResult(official) {
  if (official.isValid) return 'valid';
  if (official.diagnostics.some((message) => message.includes('DOMPurify'))) {
    return 'environment_limited';
  }
  return 'invalid';
}

const results = [];

for (const fixture of fixtures) {
  let official = {
    isValid: false,
    rawType: null,
    diagnostics: [],
    validationMode: 'full',
  };

  try {
    const rawType = mermaid.detectType(fixture.source);
    official.rawType = rawType;
    const parsed = await mermaid.parse(fixture.source, { suppressErrors: false });
    official.isValid = Boolean(parsed);
  } catch (error) {
    official.diagnostics.push(error instanceof Error ? error.message : String(error));
  }

  const editableSupport =
    official.rawType && SUPPORTED_EDITABLE_FAMILIES.has(official.rawType)
      ? 'supported_family'
      : official.rawType
        ? 'unsupported_family'
        : 'invalid_source';
  const officialStatus = classifyOfficialResult(official);

  results.push({
    name: fixture.name,
    family: fixture.family,
    expectedOfficial: fixture.expectedOfficial,
    expectedEditableGate: fixture.expectedEditableGate,
    official: {
      isValid: official.isValid,
      rawType: official.rawType ?? null,
      status: officialStatus,
      validationMode: official.validationMode,
      diagnostics: official.diagnostics,
    },
    editableGate: {
      status: editableSupport,
    },
    matchesExpectation: {
      official:
        fixture.expectedOfficial === 'valid'
          ? officialStatus === 'valid' || officialStatus === 'environment_limited'
          : officialStatus === fixture.expectedOfficial,
      editableGate: editableSupport === fixture.expectedEditableGate,
    },
  });
}

const familySummary = Object.values(
  results.reduce((acc, entry) => {
    const existing = acc[entry.family] ?? {
      family: entry.family,
      total: 0,
      officialValid: 0,
      officialEnvironmentLimited: 0,
      officialInvalid: 0,
      supportedFamilies: 0,
      unsupportedFamilies: 0,
      invalidSources: 0,
      officialExpectationMatches: 0,
      editableExpectationMatches: 0,
    };

    existing.total += 1;
    if (entry.official.status === 'valid') existing.officialValid += 1;
    if (entry.official.status === 'environment_limited') existing.officialEnvironmentLimited += 1;
    if (entry.official.status === 'invalid') existing.officialInvalid += 1;
    if (entry.editableGate.status === 'supported_family') existing.supportedFamilies += 1;
    if (entry.editableGate.status === 'unsupported_family') existing.unsupportedFamilies += 1;
    if (entry.editableGate.status === 'invalid_source') existing.invalidSources += 1;
    if (entry.matchesExpectation.official) existing.officialExpectationMatches += 1;
    if (entry.matchesExpectation.editableGate) existing.editableExpectationMatches += 1;

    acc[entry.family] = existing;
    return acc;
  }, {})
).sort((left, right) => left.family.localeCompare(right.family));

const summary = {
  generatedAt: new Date().toISOString(),
  totalFixtures: results.length,
  officialValid: results.filter((entry) => entry.official.status === 'valid').length,
  officialEnvironmentLimited: results.filter(
    (entry) => entry.official.status === 'environment_limited'
  ).length,
  officialInvalid: results.filter((entry) => entry.official.status === 'invalid').length,
  supportedFamilies: results.filter((entry) => entry.editableGate.status === 'supported_family')
    .length,
  unsupportedFamilies: results.filter((entry) => entry.editableGate.status === 'unsupported_family')
    .length,
  invalid: results.filter((entry) => entry.editableGate.status === 'invalid_source').length,
  officialExpectationMatches: results.filter((entry) => entry.matchesExpectation.official).length,
  editableExpectationMatches: results.filter((entry) => entry.matchesExpectation.editableGate)
    .length,
};

console.log(JSON.stringify({ summary, familySummary, results }, null, 2));
