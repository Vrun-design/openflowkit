# Code Refinement Log

## 2026-02-16: Parser Simplification (Post-Library Move)

### `src/lib/openFlowDSLParser.ts`
- **Refinement**: Extracted regex parsing logic into named helper functions (`parseDirection`, `parseFlowTitle`, `parseEdge`, `parseNode`).
- **Benefit**: The main `parseOpenFlowDSL` function is now a high-level orchestration of these helpers, significantly reducing cognitive load and nesting depth.

### `src/lib/mermaidParser.ts`
- **Refinement**: Refactored the core parsing loop to use early returns and clearer section comments (Directives, Subgraphs, Styles, Edges).
- **Benefit**: Improved readability of the main loop by reducing indentation and grouping related logic.
- **Verification**: Passed all 20 existing parser tests.