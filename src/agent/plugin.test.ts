// The Claude Code plugin (plugin/, listed by .claude-plugin/marketplace.json)
// installs the MCP server from npm plus the skill. A plugin installs only its own
// folder, so it carries a copy of the skill; neither may drift.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const plugin = json('plugin/.claude-plugin/plugin.json');
const marketplace = json('.claude-plugin/marketplace.json');
const pkg = json('mcp-server/package.json');

describe('claude code plugin', () => {
  it('has the version of the MCP package it launches', () => {
    expect(plugin.version).toBe(pkg.version);
  });

  it('launches the real package through npx', () => {
    expect(plugin.mcpServers.openflowkit).toEqual({ command: 'npx', args: ['-y', pkg.name] });
    expect(Object.keys(pkg.bin)).toContain('openflowkit-mcp');
  });

  it('is listed by the repo marketplace and ships the current skill (npm run skill:sync)', () => {
    expect(marketplace.plugins).toEqual([expect.objectContaining({ name: plugin.name, source: './plugin' })]);
    expect(readFileSync('plugin/skills/openflowkit/SKILL.md', 'utf8')).toBe(readFileSync('skills/openflowkit/SKILL.md', 'utf8'));
  });
});
