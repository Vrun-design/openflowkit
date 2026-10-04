// The data lives in the app (src/agent/starterTemplates.ts) and reaches the server through the agent bundle,
// so the editor's empty canvas and the MCP tools offer the same starters.
export { STARTER_TEMPLATES, findStarterTemplate } from './agent.js';
export type { StarterTemplate } from './agent.js';
