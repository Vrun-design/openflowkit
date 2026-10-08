import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace } from './compile';
import { elkDslLayoutPort } from '../services/elk-layout/runtime';

import { C4_STARTER } from '../agent/starterTemplates';

const STARTER_EMPTY = C4_STARTER.replace(/model \{[\s\S]*?\n\}\nviews/, 'model {\n}\nviews');

const CASES: Record<string, string> = {
  'starter with an empty model': STARTER_EMPTY,
  'model {} with views {}': 'architecture\nmodel {}\nviews {}\n',
  'model {} alone': 'architecture\nmodel {}\n',
  'model {} with starter views': 'architecture\ntitle: Empty\nmodel {\n}\nviews {\n view landscape\n view context of Shop\n view container of Shop\n}\n',
  'model {} with a flow': 'architecture\nmodel {\n}\nflow "F" {\n intro "x"\n}\n',
};

describe('empty C4 model', () => {
  for (const [name, text] of Object.entries(CASES)) {
    it(`compiles ${name} without hanging`, async () => {
      const compiled = await compile(text, { layout: elkDslLayoutPort });
      expect(compiled).toBeTruthy();
    }, 2000);
    it(`compiles workspace ${name} without hanging`, async () => {
      const compiled = await compileWorkspace(text, { layout: elkDslLayoutPort });
      expect(compiled).toBeTruthy();
    }, 2000);
  }
});
