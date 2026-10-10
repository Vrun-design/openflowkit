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

  it.each([
    ['eks', 'containers-elastic-kubernetes-service'],
    ['route53', 'networking-content-delivery-route-53'],
    ['route 53', 'networking-content-delivery-route-53'],
    ['alb', 'networking-content-delivery-elastic-load-balancing'],
    ['kubernetes pod', 'devops-ai-ml-kubernetes'],
  ])('puts the service an acronym names first: %s', (query, shapeId) => {
    expect(searchIcons(query).icons[0]?.shapeId).toBe(shapeId);
  });

  it('keeps an alias hit inside the chosen pack', () => {
    expect(searchIcons('eks', 'azure').icons.every((icon) => icon.provider === 'azure')).toBe(true);
  });

  it('labels a cloud icon by its product name, not its catalogue path', () => {
    const label = (shapeId: string) => searchIcons(shapeId, 'aws').icons.find((icon) => icon.shapeId === shapeId)?.label;
    expect(label('databases-rds')).toBe('RDS');
    expect(label('resource-databases-rds-multi-az')).toBe('RDS Multi-AZ');
    expect(label('containers-elastic-kubernetes-service')).toBe('Elastic Kubernetes Service');
    // Azure files Cosmos DB under Databases and IoT: a repeated name says its category.
    expect(searchIcons('cosmos', 'azure').icons[0]?.label).toBe('Azure Cosmos Db (Databases)');
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
