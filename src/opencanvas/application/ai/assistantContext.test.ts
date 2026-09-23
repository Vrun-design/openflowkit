import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import { createEmptyV2Page } from '../../presentation/v2/v2Document';
import type { ScenePage } from '../../domain/document/types';
import { buildDslPageCommand } from '../dsl/dslPageCommand';
import { assistantContext, selectedFrameIds } from './assistantContext';

async function twoDiagrams() {
  const first = await compile('flowchart\ntitle: Checkout\nPay -> Ship');
  const second = await compile('flowchart\nLogin -> Home', { origin: { x: 900, y: 0 } });
  let page = (buildDslPageCommand({ ...createEmptyV2Page(), name: 'Flows' }, first) as { after: ScenePage }).after;
  page = (buildDslPageCommand(page, second) as { after: ScenePage }).after;
  return { page, first: first.frame.id, second: second.frame.id };
}

describe('assistant context', () => {
  it('shows the whole page: every diagram with its authored text', async () => {
    const { page, first, second } = await twoDiagrams();
    const context = assistantContext(page, [], 'page');
    expect(context.pageName).toBe('Flows');
    expect(context.frames.map(({ id }) => id)).toEqual([first, second]);
    expect(context.frames[0]).toMatchObject({ title: 'Checkout', family: 'flowchart' });
    expect(context.frames[0]!.dsl).toContain('Pay -> Ship');
    expect(context.outOfScope).toBe(0);
  });

  it('narrows to the diagram holding the selected shape and names it', async () => {
    const { page, second } = await twoDiagrams();
    expect(selectedFrameIds(page, ['login'])).toEqual([second]);
    const context = assistantContext(page, ['login'], 'selection');
    expect(context.frames.map(({ id }) => id)).toEqual([second]);
    expect(context.focus).toEqual(['Login']);
    expect(context.outOfScope).toBe(1);
  });

  it('counts a selected frame as its own diagram, without making it a focus label', async () => {
    const { page, first } = await twoDiagrams();
    const context = assistantContext(page, [first], 'selection');
    expect(context.frames.map(({ id }) => id)).toEqual([first]);
    expect(context.focus).toEqual([]);
  });
});
