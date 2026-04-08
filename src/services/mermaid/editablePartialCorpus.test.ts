import { describe, expect, it } from 'vitest';
import { parseMermaidByType } from './parseMermaidByType';

interface PartialCorpusCase {
  name: string;
  source: string;
  diagramType:
    | 'flowchart'
    | 'stateDiagram'
    | 'classDiagram'
    | 'erDiagram'
    | 'architecture'
    | 'sequence'
    | 'mindmap'
    | 'journey';
  diagnosticIncludes: string[];
  expectedDiagnosticCodes?: string[];
}

const PARTIAL_CORPUS: PartialCorpusCase[] = [
  {
    name: 'flowchart malformed structure still recovers',
    diagramType: 'flowchart',
    source: `
      flowchart TD
      subgraph
        A --> B
      stray words
      end
      end
    `,
    diagnosticIncludes: [
      'Invalid flowchart subgraph declaration at line',
      'Unexpected flowchart block closer at line',
    ],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'state invalid direction still recovers',
    diagramType: 'stateDiagram',
    source: `
      stateDiagram-v2
      direction RLX
      [*] --> Idle
    `,
    diagnosticIncludes: ['Invalid stateDiagram direction syntax at line'],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'class malformed relation still recovers',
    diagramType: 'classDiagram',
    source: `
      classDiagram
      class User
      User -> Account
      stray words
    `,
    diagnosticIncludes: [
      'Invalid class relation syntax at line',
      'Unrecognized classDiagram line at line',
    ],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'er malformed declaration still recovers',
    diagramType: 'erDiagram',
    source: `
      erDiagram
      CUSTOMER {
        string id PK
      }
      entity ORDER {
      CUSTOMER -> ORDER
    `,
    diagnosticIncludes: [
      'Invalid entity declaration at line',
      'Invalid erDiagram relation syntax at line',
    ],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'architecture implicit-node recovery stays editable',
    diagramType: 'architecture',
    source: `
      architecture-beta
      service api(server)[API]
      api --> cache
    `,
    diagnosticIncludes: ['Recovered implicit service node "cache"'],
    expectedDiagnosticCodes: ['MERMAID_RECOVERY'],
  },
  {
    name: 'sequence malformed message still recovers',
    diagramType: 'sequence',
    source: `
      sequenceDiagram
      participant A
      participant B
      A->>B: Hello
      A->>
    `,
    diagnosticIncludes: ['Invalid message at line'],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'mindmap malformed wrapper still recovers',
    diagramType: 'mindmap',
    source: `
      mindmap
        Root
          bad((Unclosed
          Child
    `,
    diagnosticIncludes: ['Malformed mindmap wrapper syntax at line'],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
  {
    name: 'journey invalid score still recovers',
    diagramType: 'journey',
    source: `
      journey
      title Checkout
      section Happy
      Search: User
      Resolve issue: 5: Agent
    `,
    diagnosticIncludes: ['Invalid journey score at line'],
    expectedDiagnosticCodes: ['MERMAID_SYNTAX'],
  },
];

describe('Mermaid editable partial corpus', () => {
  it('keeps malformed-but-recoverable fixtures in editable_partial with structured diagnostics', () => {
    for (const corpusCase of PARTIAL_CORPUS) {
      const result = parseMermaidByType(corpusCase.source);

      expect(result.diagramType, corpusCase.name).toBe(corpusCase.diagramType);
      expect(result.error, corpusCase.name).toBeUndefined();
      expect(result.importState, corpusCase.name).toBe('editable_partial');
      expect(result.nodes.length, corpusCase.name).toBeGreaterThan(0);
      expect(result.structuredDiagnostics?.length ?? 0, corpusCase.name).toBeGreaterThan(0);
      for (const expectedCode of corpusCase.expectedDiagnosticCodes ?? ['MERMAID_SYNTAX']) {
        expect(
          result.structuredDiagnostics?.some((diagnostic) => diagnostic.code === expectedCode),
          `${corpusCase.name} should include structured diagnostic code "${expectedCode}"`
        ).toBe(true);
      }

      corpusCase.diagnosticIncludes.forEach((expectedMessage) => {
        expect(
          result.diagnostics?.some((diagnostic) => diagnostic.includes(expectedMessage)),
          `${corpusCase.name} should include diagnostic containing "${expectedMessage}"`
        ).toBe(true);
      });
    }
  });
});
