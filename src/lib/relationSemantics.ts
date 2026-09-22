import { ER_RELATION_TOKEN, isErRelationToken } from '@/opencanvas/domain/connectors/presentation';

export const CLASS_RELATION_TOKENS = [
  '<|--',
  '--|>',
  '*--',
  '--*',
  'o--',
  '--o',
  '..|>',
  '<|..',
  '..>',
  '<..',
  '<--',
  '-->',
  '<-->',
  '..',
  '--',
] as const;

export type ClassRelationToken = (typeof CLASS_RELATION_TOKENS)[number];

/** Crow's-foot relations are compositional; the domain owns the grammar. */
export type ERRelationToken = string;


export const DEFAULT_CLASS_RELATION: ClassRelationToken = '-->';
export const DEFAULT_ER_RELATION: ERRelationToken = '||--||';

const CLASS_RELATION_TOKEN_SET = new Set<string>(CLASS_RELATION_TOKENS);

export function isClassRelationToken(value: string): value is ClassRelationToken {
  return CLASS_RELATION_TOKEN_SET.has(value);
}

export function isERRelationToken(value: string): value is ERRelationToken {
  return isErRelationToken(value);
}

export function buildClassRelationTokenRegexPattern(): string {
  return CLASS_RELATION_TOKENS
    .slice()
    .sort((left, right) => right.length - left.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

export function buildERRelationTokenRegexPattern(): string {
  return ER_RELATION_TOKEN.source.slice(1, -1);
}
