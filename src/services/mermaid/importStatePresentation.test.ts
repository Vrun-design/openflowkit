import { describe, expect, it } from 'vitest';
import {
  appendMermaidImportGuidance,
  getMermaidImportStateDetail,
  getMermaidImportStateGuidance,
  getMermaidImportStateLabel,
  getMermaidImportToastMessage,
  summarizeMermaidImport,
} from './importStatePresentation';

describe('importStatePresentation', () => {
  it('describes partially editable Mermaid imports consistently', () => {
    expect(getMermaidImportStateLabel('editable_partial')).toBe('Ready with warnings');
    expect(
      getMermaidImportStateDetail({
        importState: 'editable_partial',
        diagramType: 'sequence',
        nodeCount: 4,
        edgeCount: 3,
      })
    ).toBe('4 nodes, 3 edges, partial editability (advanced fragment fidelity)');
    expect(
      getMermaidImportToastMessage({
        importState: 'editable_partial',
        warningCount: 2,
      })
    ).toBe('Imported with warnings: partial editability (2 diagnostic warnings).');
  });

  it('summarizes clean Mermaid imports without fallback wording', () => {
    expect(
      summarizeMermaidImport({
        diagramType: 'flowchart',
        importState: 'editable_full',
        nodeCount: 2,
        edgeCount: 1,
      })
    ).toBe('Mermaid flowchart: Ready to apply (2 nodes, 1 edges)');
  });

  it('adds guidance for unsupported Mermaid families', () => {
    expect(getMermaidImportStateGuidance('unsupported_family')).toContain('not editable yet');
    expect(
      appendMermaidImportGuidance({
        message: 'Mermaid "gitGraph" is not supported yet in editable mode.',
        importState: 'unsupported_family',
      })
    ).toContain('not editable yet');
  });

  it('uses family-specific guidance for partial imports when support matrix data exists', () => {
    expect(getMermaidImportStateGuidance('editable_partial', 'classDiagram')).toContain(
      'generics and visibility richness'
    );
    expect(
      appendMermaidImportGuidance({
        message: 'Some class members could not be mapped cleanly.',
        importState: 'unsupported_construct',
        diagramType: 'classDiagram',
      })
    ).toContain('Current partial areas for Class Diagram include generics and visibility richness');
  });
});
