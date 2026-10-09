import { describe, expect, it } from 'vitest';
import type { MapModel } from '../../../dsl/map/types';
import type { ArchModel } from '../../../dsl/model/types';
import { mapFindMatches, pathToReveal } from './mapFind';

const n = (id: string, name: string, parent: string | null, children: string[] = [], kind = 'part', extra = {}) =>
  ({ id, name, kind, parent, children, files: 1, loc: 0, ...extra });
const model = {
  root: 'root',
  nodes: {
    root: n('root', 'root', null, ['web', 'sys#more'], 'folder'),
    web: n('web', 'Web App', 'root', ['ui']),
    ui: n('ui', 'Checkout UI', 'web'),
    'sys#more': n('sys#more', 'Webhooks and more', 'root', ['hook'], 'more'),
    hook: n('hook', 'Hook', 'sys#more', [], 'part', { path: 'src/Ünïcode.ts' }),
  },
  links: [], source: {}, stats: {},
} as unknown as MapModel;
const arch = { elements: [{ id: 'ui', name: 'Checkout UI', tech: 'React', desc: 'Takes payment', tags: [], links: [] }] } as unknown as ArchModel;

describe('mapFindMatches', () => {
  it('matches name, tech and description, case-insensitively, inside closed boxes, in tree order', () => {
    expect(mapFindMatches(model, arch, 'web')).toEqual(['web']);
    expect(mapFindMatches(model, arch, 'REACT')).toEqual(['ui']);
    expect(mapFindMatches(model, arch, 'payment')).toEqual(['ui']);
    expect(mapFindMatches(model, arch, 'c')).toEqual(['ui', 'hook']);
  });
  it('matches a repo node by path, skips the root and more boxes, and ignores a blank query', () => {
    expect(mapFindMatches(model, null, 'src/')).toEqual(['hook']);
    expect(mapFindMatches(model, null, 'root')).toEqual([]);
    expect(mapFindMatches(model, null, '  ')).toEqual([]);
  });
});

describe('pathToReveal', () => {
  it('lists ancestors outermost first, without the root, folds included', () => {
    expect(pathToReveal(model, 'ui')).toEqual(['web']);
    expect(pathToReveal(model, 'hook')).toEqual(['sys#more']);
    expect(pathToReveal(model, 'web')).toEqual([]);
  });
});
