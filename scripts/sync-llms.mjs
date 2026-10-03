// public/llms.txt is the agent skill for agents that fetch the site instead of
// installing skills: the same body, a plain header. src/agent/skill.test.ts
// fails when the two drift; run `npm run skill:sync` after editing the skill.
import { readFileSync, writeFileSync } from 'node:fs';

export const LLMS_HEADER = '# OpenFlowKit\n\n> Diagrams agents write, kept valid, editable and saved next to the code.\n> Install as a skill: skills/openflowkit/SKILL.md in https://github.com/Vrun-design/openflowkit\n';

export function llmsText(skill) {
  return `${LLMS_HEADER}${skill.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\n*# [^\n]*\n/, '')}`;
}

if (process.argv[1]?.endsWith('sync-llms.mjs')) {
  writeFileSync('public/llms.txt', llmsText(readFileSync('skills/openflowkit/SKILL.md', 'utf8')));
}
