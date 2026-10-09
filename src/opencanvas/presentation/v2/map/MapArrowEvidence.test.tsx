import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AggEdge, Evidence } from '../../../../dsl/map/types';
import { githubEvidenceLink } from '../../../../services/discovery/githubRepo';
import { MapArrowEvidence } from './MapArrowEvidence';

const gh = githubEvidenceLink({ owner: 'o', repo: 'r', ref: 'abc123' } as Parameters<typeof githubEvidenceLink>[0]);
const link = (file: string, line: number) => gh({ file, line });
const names: Record<string, string> = { web: 'web', api: 'api' };
const ev = (file: string, line: number, text = 'x'): Evidence => ({ file, line, text });
const edge = (over: Partial<AggEdge>): AggEdge => ({
  key: 'k', kind: 'call', parent: 'root', from: 'web', to: 'api', count: 1, forward: 1, reverse: 0, both: false,
  evidence: [], reverseEvidence: [], links: [], inferred: false, ...over,
});
const show = (e: AggEdge, l = link) => render(<MapArrowEvidence arrow={{ edge: e, link: l, name: (id) => names[id] ?? id }} />);

describe('MapArrowEvidence', () => {
  it('shows title, kind and count, and links each file:line to the commit with encoded paths', () => {
    show(edge({ forward: 2, evidence: [ev('src/a b/#c/ünï.ts', 7, '<img src=x onerror=alert(1)>'), ev('src/b.ts', 3)] }));
    expect(screen.getByText('web → api')).toBeTruthy();
    expect(screen.getByText('web calls api · 2')).toBeTruthy();
    const a = screen.getByText('src/a b/#c/ünï.ts:7') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('https://github.com/o/r/blob/abc123/src/a%20b/%23c/%C3%BCn%C3%AF.ts#L7');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(screen.getByText('<img src=x onerror=alert(1)>').tagName).toBe('CODE');
  });

  it('lists the reverse direction under a both-ways arrow', () => {
    show(edge({ both: true, forward: 1, reverse: 1, evidence: [ev('a.ts', 1)], reverseEvidence: [ev('b.ts', 2)] }));
    expect(screen.getByText('web ⇄ api')).toBeTruthy();
    expect(screen.getByText('api calls web · 1')).toBeTruthy();
    expect(within(screen.getByLabelText('Evidence: api to web')).getByText('b.ts:2')).toBeTruthy();
  });

  it('caps at 50 rows and says how many more', () => {
    show(edge({ forward: 120, evidence: Array.from({ length: 80 }, (_, i) => ev('a.ts', i + 1)) }));
    expect(screen.getAllByRole('listitem')).toHaveLength(50);
    expect(screen.getByText('and 70 more')).toBeTruthy();
  });

  it('shows plain text when the repo has no web home', () => {
    show(edge({ evidence: [ev('a.ts', 1)] }), () => null);
    expect(screen.getByText('a.ts:1').tagName).toBe('SPAN');
  });
});
