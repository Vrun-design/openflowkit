import { describe, expect, it } from 'vitest';
import { resolveDslIcon } from './iconResolver';
import { compile } from '../../dsl/compile';
import { AUTO_ICON_IDS } from '../../dsl/autoIcon';
import awsFixture from '../../dsl/fixtures/architecture/aws-3tier.dsl?raw';

describe('resolveDslIcon', () => {
  it('resolves provider slash and dash syntax', () => {
    const slash = resolveDslIcon('aws/lambda');
    const dash = resolveDslIcon('aws-lambda');
    expect(slash?.packId).toBe('aws-official-starter-v1');
    expect(dash).toEqual(slash);
  });

  it('returns null for unknown ids', () => {
    expect(resolveDslIcon('aws/not-a-real-service-xyz')).toBeNull();
    expect(resolveDslIcon('unknown/lambda')).toBeNull();
  });

  it('resolves bundled icons in the architecture fixture', async () => {
    const result = await compile(awsFixture, { resolveIcon: resolveDslIcon });
    expect(result.nodes.filter((node) => typeof node.content.archIconShapeId === 'string')).toHaveLength(3);
    expect(result.diagnostics.filter((item) => item.code === 'W132')).toEqual([]);
  });

  it('resolves every auto-icon id to exactly that icon', () => {
    const unresolved = AUTO_ICON_IDS.filter((id) => resolveDslIcon(id)?.shapeId !== id.split('/')[1]);
    expect(unresolved).toEqual([]);
  });
});
