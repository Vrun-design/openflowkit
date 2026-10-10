import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { MapModel } from '../../../../dsl/map/types';
import { V2RepoMapChips, V2RepoMapState } from './V2RepoMapState';
import type { RepoMapState } from './useRepoMap';

beforeAll(() => { window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as never; });

const base: RepoMapState = { status: 'loading', model: null, progress: { read: 0, total: 0 }, problem: null, retry: vi.fn(), submitToken: vi.fn() };
const model = (files: number) => ({ stats: { files } }) as unknown as MapModel;
const view = (map: Partial<RepoMapState>) => render(<MemoryRouter><V2RepoMapState source={{ owner: 'a', repo: 'b' }} map={{ ...base, ...map }} /></MemoryRouter>);

describe('V2RepoMapState', () => {
  it('reading, with a counter once the total is known', () => {
    view({ progress: { read: 2, total: 1200 } });
    expect(screen.getByText('Reading a/b…')).toBeTruthy();
    expect(screen.getByText('Reading 2 of 1,200 files…')).toBeTruthy();
  });
  it('rate limit shows the token form', () => {
    const submitToken = vi.fn();
    view({ status: 'problem', submitToken, problem: { status: 'problem', title: 'GitHub is limiting reads from your network.', detail: 'd', retry: false, hero: 'torn-page', askToken: true } });
    fireEvent.click(screen.getByText('Try with token'));
    expect(submitToken).toHaveBeenCalledWith('');
  });
  it('offline offers retry', () => {
    const retry = vi.fn();
    view({ status: 'problem', retry, problem: { status: 'problem', title: 'GitHub could not be reached.', detail: 'd', retry: true, hero: 'torn-page' } });
    fireEvent.click(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });
  it('not found has only a way home', () => {
    view({ status: 'problem', problem: { status: 'problem', title: 'This repo was not found, or it is private.', detail: 'd', retry: false, hero: 'lost-link' } });
    expect(screen.getByText('Back to home')).toBeTruthy();
    expect(screen.queryByText('Try again')).toBeNull();
  });
  it('never breaks the CLI command across lines', () => {
    view({ status: 'problem', problem: { status: 'problem', title: 'This repo was not found, or it is private.', detail: 'a/b wasn\'t found. Use the CLI: npx -p @vrun-design/openflowkit-mcp openflowkit map .', retry: false, hero: 'lost-link' } });
    const command = screen.getByText('npx -p @vrun-design/openflowkit-mcp openflowkit map .');
    expect(command.tagName).toBe('CODE');
    expect(command.style.whiteSpace).toBe('nowrap');
  });
  it('a repo that is not found offers the address field again, to fix a typo', () => {
    view({ status: 'problem', problem: { status: 'problem', title: 'This repo was not found, or it is private.', detail: 'd', retry: false, hero: 'lost-link', retype: true } });
    expect(screen.getByRole('form', { name: 'Map a GitHub repo' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Map a GitHub repo' })).toHaveValue('a/b');
  });
  it('finished with no sources says nothing to map', () => {
    view({ status: 'ready', model: model(0) });
    expect(screen.getByText('Nothing to map here.')).toBeTruthy();
  });
  it('renders nothing once there is a map to draw', () => {
    expect(view({ status: 'loading', model: model(4) }).container.textContent).toBe('');
    expect(view({ status: 'ready', model: model(4) }).container.textContent).toBe('');
  });
});

describe('V2RepoMapChips', () => {
  it('shows only the counter while loading, then how much of the repo was read', () => {
    render(<V2RepoMapChips map={{ ...base, model: model(4), progress: { read: 1, total: 4, sampled: { read: 4, total: 90 } } }} />);
    expect(screen.getByText('Reading 1 of 4 files…')).toBeTruthy();
    expect(screen.queryByText(/^Read 4 of 90/)).toBeNull();
    render(<V2RepoMapChips map={{ ...base, status: 'ready', model: model(4), progress: { read: 4, total: 4, sampled: { read: 3, total: 90 } } }} />);
    expect(screen.getByText('Read 3 of 90 files')).toBeTruthy();
  });
  it('a cached map shown because GitHub\'s limit was reached says it may be out of date', () => {
    render(<V2RepoMapChips map={{ ...base, status: 'ready', model: model(4), progress: { read: 4, total: 4, stale: true } }} />);
    expect(screen.getByText('May be out of date: GitHub\'s limit was reached.')).toBeTruthy();
  });
  it('a cached map of another ref says which one it shows', () => {
    render(<V2RepoMapChips map={{ ...base, status: 'ready', model: model(4), progress: { read: 4, total: 4, stale: true, staleRef: 'main' } }} />);
    expect(screen.getByText('May be out of date: showing main, GitHub\'s limit was reached.')).toBeTruthy();
  });
  it('a listing GitHub cut short reads as "of N+ files"', () => {
    render(<V2RepoMapChips map={{ ...base, status: 'ready', model: model(4), progress: { read: 4, total: 4, sampled: { read: 4, total: 4, truncated: true } } }} />);
    expect(screen.getByText('Read 4 of 4+ files')).toBeTruthy();
  });
  it('shows no counter before a map is drawn or while the total is unknown (the state screen has its own)', () => {
    expect(render(<V2RepoMapChips map={{ ...base, progress: { read: 0, total: 40 } }} />).container.textContent).toBe('');
    expect(render(<V2RepoMapChips map={{ ...base, model: model(4) }} />).container.textContent).toBe('');
  });
  it('is empty when ready and not sampled', () => {
    expect(render(<V2RepoMapChips map={{ ...base, status: 'ready', model: model(4) }} />).container.textContent).toBe('');
  });
});
