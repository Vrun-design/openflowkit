// public/llms.txt is the agent skill for agents that fetch the site instead of
// installing skills: the same body, a plain header. The Claude Code plugin
// ships its own copy (plugin/skills), since a plugin installs only its folder.
// src/agent/skill.test.ts fails when they drift; run `npm run skill:sync` after editing the skill.
import { readFileSync, writeFileSync } from 'node:fs';

export const LLMS_HEADER = '# OpenFlowKit\n\n> Diagrams agents write, kept valid, editable and saved next to the code.\n> Install as a skill: skills/openflowkit/SKILL.md in https://github.com/Vrun-design/openflowkit\n';

export function llmsText(skill) {
  return `${LLMS_HEADER}${skill.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\n*# [^\n]*\n/, '')}`;
}

if (process.argv[1]?.endsWith('sync-llms.mjs')) {
  const skill = readFileSync('skills/openflowkit/SKILL.md', 'utf8');
  writeFileSync('public/llms.txt', llmsText(skill));
  writeFileSync('plugin/skills/openflowkit/SKILL.md', skill);
}
