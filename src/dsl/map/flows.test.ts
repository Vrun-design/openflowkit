import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { FIXTURE } from './fixture';
import { validateFlow } from './flows';

const model = buildMap(FIXTURE);

describe('validateFlow', () => {
  it('proves a step with the import line behind it', () => {
    const { steps, errors } = validateFlow(model, [{ from: 'web/App.tsx', to: 'server/routes/r01.ts', text: 'App calls the API.' }]);
    expect(errors).toEqual([]);
    expect(steps[0].proof).toMatchObject({ kind: 'import', evidence: [{ file: 'web/App.tsx', line: 5 }] });
  });

  it('proves a step with a non-import link, and an external endpoint', () => {
    const { steps } = validateFlow(model, [{ from: 'server/routes/r01.ts', to: 'ext:stripe', text: 'It charges the card.' }]);
    expect(steps[0].proof).toMatchObject({ kind: 'call', evidence: [{ line: 9 }] });
  });

  it('leaves a step with no matching link unproven, in order', () => {
    const { steps } = validateFlow(model, [
      { from: 'web/ui/Card.tsx', to: 'web/ui/Button.tsx', text: 'Wrong way round.' },
      { from: 'web/ui/Button.tsx', to: 'web/App.tsx', text: 'Nothing goes back.' },
    ]);
    expect(steps.map((s) => s.proof)).toEqual([null, null]);
    expect(steps.map((s) => s.text)).toEqual(['Wrong way round.', 'Nothing goes back.']);
  });

  it('proves a part-level step by the files beneath, three lines at most, sorted', () => {
    const { steps } = validateFlow(model, [
      { from: 'web', to: 'server', text: 'The app calls the server.' },
      { from: 'server', to: 'web', text: 'And back.' },
      { from: 'web/App.tsx', to: 'web/ui', text: 'Through the folder import.' },
    ]);
    expect(steps[0].proof?.kind).toBe('import');
    expect(steps[0].proof?.evidence.map((e) => `${e.file}:${e.line}`)).toEqual(['web/App.tsx:3', 'web/App.tsx:4', 'web/App.tsx:5']);
    expect(steps[1].proof?.evidence).toHaveLength(3);
    expect(steps[2].proof).toMatchObject({ kind: 'import', evidence: [{ file: 'web/App.tsx', line: 1 }] });
  });

  it('does not prove the reverse of a one-way link', () => {
    const one = buildMap({ files: [{ path: 'a/x.ts', loc: 1 }, { path: 'b/y.ts', loc: 1 }], imports: [{ from: 'a/x.ts', to: 'b/y.ts', line: 1, text: 'i' }] });
    const { steps } = validateFlow(one, [{ from: 'a', to: 'b', text: 'ok' }, { from: 'b', to: 'a', text: 'reverse' }]);
    expect(steps.map((s) => s.proof !== null)).toEqual([true, false]);
  });

  it('drops steps that name a node that does not exist and says which', () => {
    const { steps, errors } = validateFlow(model, [
      { from: 'web/App.tsx', to: 'ghost.ts', text: 'x' },
      { from: 'web/App.tsx', to: 'web/ui', text: 'ok' },
    ]);
    expect(steps.map((s) => s.text)).toEqual(['ok']);
    expect(errors).toEqual(['step 1: unknown node "ghost.ts"']);
  });
});
