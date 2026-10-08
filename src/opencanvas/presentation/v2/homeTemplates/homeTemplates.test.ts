// Home shows the starter templates as pictures without loading the DSL compiler or ELK:
// the pictures are checked in beside this test, which redraws each one through the editor's
// own compile → ELK → export path and fails when a file has drifted.
// UPDATE_HOME_PREVIEWS=1 npx vitest run src/opencanvas/presentation/v2/homeTemplates rewrites them.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { STARTER_TEMPLATES } from '../../../../agent/starterTemplates';
import { compile } from '../../../../dsl/compile';
import { elkDslLayoutPort } from '../../../../services/elk-layout/runtime';
import { resolveDslIcon } from '../../../../services/dsl/iconResolver';
import { createEmptyV2Document } from '../v2Document';
import { buildV2Thumbnail } from '../v2Thumbnail';

const DIR = __dirname;
const PUBLIC = join(DIR, '../../../../../public');

beforeAll(() => {
  // Icon art is fetched from /public in the app; read the same files here.
  vi.stubGlobal('fetch', async (url: string) => {
    try {
      return new Response(readFileSync(join(PUBLIC, decodeURIComponent(new URL(url, 'http://x').pathname))), { status: 200 });
    } catch {
      return new Response('', { status: 404 });
    }
  });
});
afterAll(() => vi.unstubAllGlobals());

async function drawn(name: string, title: string, dsl: string) {
  const compiled = await compile(dsl, { layout: elkDslLayoutPort, resolveIcon: resolveDslIcon, autoIcons: true });
  const document = createEmptyV2Document(`template-${name}`, title);
  const page = document.pages[0]!;
  const thumbnail = await buildV2Thumbnail({ ...document, pages: [{ ...page, diagramKind: compiled.meta.family,
    nodes: [compiled.frame, ...compiled.groups, ...compiled.nodes], connectors: compiled.connectors }] });
  expect(thumbnail).not.toBeNull();
  return thumbnail!;
}

describe('home template previews', () => {
  it.each(STARTER_TEMPLATES.map((template) => [template.name, template] as const))('%s matches its checked-in picture', async (name, template) => {
    const thumbnail = await drawn(name, template.title, template.dsl);
    for (const theme of ['light', 'dark'] as const) {
      const file = join(DIR, `${name}-${theme}.svg`);
      if (process.env.UPDATE_HOME_PREVIEWS) writeFileSync(file, thumbnail[theme]);
      expect(thumbnail[theme], `${name}-${theme}.svg drifted: rerun with UPDATE_HOME_PREVIEWS=1`).toBe(readFileSync(file, 'utf8'));
    }
  });

  // Default (unset) fills and label plates wash into the dark canvas instead of staying paper-white.
  it.each(['request-sequence', 'order-state'])('%s draws no paper-white shape or label plate in dark', async (name) => {
    const template = STARTER_TEMPLATES.find((candidate) => candidate.name === name)!;
    const { dark } = await drawn(name, template.title, template.dsl);
    expect(dark).not.toMatch(/<(rect|path)\b[^>]*fill="#(ffffff|f8fafc|f5f3ff)"/i);
  });
});
