import { expect, it } from 'vitest';
import { groupByFile } from './evidenceLink';

it('groups lines by file in first-seen order', () => {
  const rows = [{ file: 'b.ts', line: 1 }, { file: 'a.ts', line: 2 }, { file: 'b.ts', line: 3 }];
  expect(groupByFile(rows)).toEqual([['b.ts', [rows[0], rows[2]]], ['a.ts', [rows[1]]]]);
});
