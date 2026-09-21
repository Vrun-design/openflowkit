import { describe, expect, it } from 'vitest';
import { iconCounts, searchIcons } from './iconSearch';

describe('searchIcons', () => {
  it('ranks id prefix matches first and caps the page', () => {
    const { icons, total } = searchIcons('alarm', 'tabler', 5);
    expect(icons[0]?.shapeId).toBe('alarm');
    expect(icons).toHaveLength(5);
    expect(total).toBeGreaterThan(5);
  });

  it('filters by provider and finds cloud services by label', () => {
    const { icons } = searchIcons('lambda', 'aws');
    expect(icons.length).toBeGreaterThan(0);
    expect(icons.every((icon) => icon.provider === 'aws')).toBe(true);
  });

  it('returns the whole pool for an empty query', () => {
    expect(searchIcons('', 'gcp').total).toBeGreaterThan(0);
  });
});

describe('icon packs', () => {
  it('scopes cloud to every vendor and counts per provider', () => {
    const cloud = iconCounts('cloud').map(({ provider }) => provider);
    expect(cloud).toEqual(expect.arrayContaining(['aws', 'azure', 'gcp', 'cncf']));
    expect(cloud).not.toContain('tabler');
    expect(searchIcons('', 'cloud').total).toBe(iconCounts('cloud').reduce((sum, { total }) => sum + total, 0));
  });
});
