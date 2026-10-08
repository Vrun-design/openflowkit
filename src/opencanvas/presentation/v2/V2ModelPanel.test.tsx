import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { compile } from '@/dsl/compile';
import { dslFrameRaw } from '@/dsl/sceneMeta';
import { archModelFromJson } from '@/dsl/model/model';
import { ElementLinks, RelationNote } from './V2ModelPanel';

const relation = (link: string) => ({ label: 'Reads', link });

describe('RelationNote', () => {
  it('links an https evidence URL, opened safely in a new tab', () => {
    render(<RelationNote relation={relation('https://github.com/acme/shop/blob/main/web/app.ts#L3')} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/acme/shop/blob/main/web/app.ts#L3');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'http://example.com', ' https://x.com', 'web/app.ts:3', '//evil.com'])('shows %s as plain text, never a link', (value) => {
    render(<RelationNote relation={relation(value)} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
  });
});

describe('ElementLinks', () => {
  it('renders an https link as an anchor and anything else as plain text', () => {
    render(<ElementLinks links={['https://example.com/adr/1.md', 'javascript:alert(1)']} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/adr/1.md');
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('renders no anchor for a javascript: link', () => {
    render(<ElementLinks links={['javascript:alert(1)']} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('RelationNote on a parsed relation', () => {
  it('shows the anchor for a link written in the DSL', async () => {
    const text = 'architecture\nmodel {\n  system A\n  system B\n  A -> B : uses [link: https://github.com/x/y/blob/HEAD/f#L1]\n}\nviews { view landscape }\n';
    const model = archModelFromJson((dslFrameRaw((await compile(text)).frame).arch as { model: unknown }).model)!;
    render(<RelationNote relation={model.relations[0]!} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/x/y/blob/HEAD/f#L1');
  });
});
