const n=`# Schema Compatibility Matrix

This document defines compatibility guarantees for FlowMind JSON documents and OpenFlow DSL text inputs.

## JSON Document Schema

Current writer version: \`1.0\`

| Input Version | Import Support | Behavior | Guarantee |
| --- | --- | --- | --- |
| \`1.x\` | Supported | Loads without compatibility warnings | Backward-compatible within major version 1 |
| Missing \`version\` | Supported (legacy mode) | Loads with warning: legacy unversioned payload | Existing older exports remain loadable |
| \`2.x\` or higher | Not supported | Import blocked with explicit error | Prevents silent corruption on unknown major schema |

Writer policy:
- Exports always include \`version\`, \`name\`, \`createdAt\`, \`nodes\`, \`edges\`.
- Current writer version remains \`1.0\` until a breaking schema change is introduced.

## OpenFlow DSL

Supported syntax family: **FlowMind DSL V2**.

Compatibility notes:
- Parser accepts V2 syntax (\`[type] id: Label\`, edge arrows, \`group "Name" { ... }\`).
- Parser preserves backward-friendly shorthand where possible (e.g., implicit node creation from \`A -> B\`).
- Invalid/unrecognized lines are surfaced with actionable diagnostics (\`line\`, \`snippet\`, \`hint\`).

Migration policy:
- Additive syntax changes in V2 are treated as backward-compatible.
- Breaking syntax changes require a new major DSL version and explicit migration notes.

## Migration Guarantees

1. Existing unversioned JSON exports continue to import through compatibility mode.
2. Existing \`1.x\` JSON files continue to import without data-loss migration.
3. Unsupported future major versions fail fast with an explicit error message.
4. Parser/export diagnostics are improved without mutating valid user payload semantics.
`;export{n as default};
