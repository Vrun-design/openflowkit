import { describe, expect, it } from 'vitest';
import { TABLER_ICON_NAMES, tablerSvg } from './tablerIcons';

describe('tabler icons', () => {
  it('lists the installed outline icons', () => {
    expect(TABLER_ICON_NAMES.length).toBeGreaterThan(4000);
    expect(TABLER_ICON_NAMES).toContain('alarm');
  });

  it('renders icon nodes as a self-contained svg', () => {
    const svg = tablerSvg([['path', { d: 'M12 10l0 3l2 0' }]]);
    expect(svg).toContain('<path d="M12 10l0 3l2 0"/>');
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
});
