import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../testing/builders/documentBuilder';
import { OpenCanvasPageThumbnail } from './OpenCanvasPageThumbnail';

describe('OpenCanvas page thumbnail', () => {
  it('describes and draws visible page objects', () => {
    const page = createTestDocument({ nodes: [createTestNode('one'), createTestNode('two')] }).pages[0];
    const { container } = render(<OpenCanvasPageThumbnail page={page} />);
    expect(screen.getByRole('img', { name: 'Page 1 thumbnail with 2 objects' })).toBeTruthy();
    expect(container.querySelectorAll('svg > rect')).toHaveLength(3);
  });
});
