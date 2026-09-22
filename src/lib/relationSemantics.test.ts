import { describe, expect, it } from 'vitest';
import {
  CLASS_RELATION_TOKENS,
  DEFAULT_CLASS_RELATION,
  DEFAULT_ER_RELATION,
  buildClassRelationTokenRegexPattern,
  buildERRelationTokenRegexPattern,
  isClassRelationToken,
  isERRelationToken,
} from './relationSemantics';

describe('relationSemantics', () => {
  it('recognizes valid class relation tokens and rejects invalid ones', () => {
    CLASS_RELATION_TOKENS.forEach((token) => {
      expect(isClassRelationToken(token)).toBe(true);
    });

    expect(isClassRelationToken('-->>')).toBe(false);
    expect(isClassRelationToken('=>')).toBe(false);
    expect(DEFAULT_CLASS_RELATION).toBe('-->');
  });

  it('recognizes valid ER relation tokens and rejects invalid ones', () => {
    for (const left of ['|o', '||', '}o', '}|']) {
      for (const line of ['--', '..']) {
        for (const right of ['o|', '||', 'o{', '|{']) expect(isERRelationToken(`${left}${line}${right}`)).toBe(true);
      }
    }
    expect(isERRelationToken('||-->')).toBe(false);
    expect(isERRelationToken('}->')).toBe(false);
    expect(DEFAULT_ER_RELATION).toBe('||--||');
  });

  it('builds regex patterns that preserve longest-token matching', () => {
    const classPattern = new RegExp(buildClassRelationTokenRegexPattern());
    const erPattern = new RegExp(buildERRelationTokenRegexPattern());

    expect('A <--> B'.match(classPattern)?.[0]).toBe('<-->');
    expect('A ||--o{ B'.match(erPattern)?.[0]).toBe('||--o{');
  });
});
