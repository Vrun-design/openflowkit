# OpenFlowKit

A free, local-first, agent-native infinite canvas for technical diagrams. Direct
manipulation that feels instant, a text language (diagram-as-code) that every
diagram can be written in and read back out of, and an MCP/BYOK agent surface
that can do everything a human can on the live canvas. MIT licensed.

```
npm install
npm run dev                      # http://localhost:5173/ → the canvas
npm run typecheck && npm run lint && npm run test -- --run
npm run e2e:headed -- e2e/smoke.spec.ts
```

The plan is [docs/plan/README.md](docs/plan/README.md); what is done and what
is next is in [STATE.md](STATE.md); how to work here is in [AGENTS.md](AGENTS.md).
Public site: [openflowkit.com](https://openflowkit.com). MCP server:
[mcp-server/](mcp-server/).
