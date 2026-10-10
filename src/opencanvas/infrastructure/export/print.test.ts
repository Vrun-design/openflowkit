import { describe, expect, it } from 'vitest';
import { SVG_BACKGROUND } from './canonicalSvg';
import { buildPrintDocument } from './print';

describe('print document', () => {
  it('puts each page on its own sheet', () => {
    const html = buildPrintDocument(['<svg data-page="a"></svg>', '<svg data-page="b"></svg>'], 'Talk');
    expect(html.match(/<section class="sheet">/g)).toHaveLength(2);
    expect(html).toContain('break-after: page');
    expect(html.indexOf(encodeURIComponent('data-page="a"'))).toBeLessThan(html.indexOf(encodeURIComponent('data-page="b"')));
  });

  it('keeps each page\'s ids to itself: a duplicated page must not clip with the first page\'s outline', () => {
    const page = '<svg xmlns="http://www.w3.org/2000/svg"><clipPath id="clip-a"><rect/></clipPath><g clip-path="url(#clip-a)"/></svg>';
    const html = buildPrintDocument([page, page], 'Talk');
    // Each sheet is its own image document, so `#clip-a` resolves inside it only.
    expect(html).not.toContain('id="clip-a"');
    expect(html.match(/<img [^>]*src="data:image\/svg\+xml/g)).toHaveLength(2);
  });

  it('breaks after every sheet but the last', () => {
    expect(buildPrintDocument(['<svg></svg>'], 'T')).toContain('.sheet:last-of-type { break-after: auto; }');
  });

  it('paints the sheet in the export theme, and keeps it when printing', () => {
    expect(buildPrintDocument(['<svg></svg>'], 'T', { theme: 'dark' })).toContain(`background: ${SVG_BACKGROUND.dark}`);
    expect(buildPrintDocument(['<svg></svg>'], 'T')).toContain(`background: ${SVG_BACKGROUND.light}`);
    expect(buildPrintDocument(['<svg></svg>'], 'T')).toContain('print-color-adjust: exact');
  });

  it('escapes the title', () => {
    expect(buildPrintDocument(['<svg></svg>'], '<b>&')).toContain('<title>&lt;b&gt;&amp;</title>');
  });
});
