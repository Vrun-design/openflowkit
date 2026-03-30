import { describe, expect, it } from 'vitest';
import { parseNodeStyleData, pickNodeStyleData } from './nodeStyleData';

describe('nodeStyleData', () => {
  it('picks only style-related fields from node data', () => {
    expect(
      pickNodeStyleData({
        label: 'Node',
        color: 'blue',
        shape: 'rounded',
        fontWeight: 'bold',
        archProvider: 'aws',
      })
    ).toEqual({
      color: 'blue',
      shape: 'rounded',
      fontWeight: 'bold',
    });
  });

  it('parses only style-related fields from unknown values', () => {
    expect(
      parseNodeStyleData({
        color: 'emerald',
        shape: 'capsule',
        label: 'ignore me',
      })
    ).toEqual({
      color: 'emerald',
      shape: 'capsule',
    });
  });

  it('returns null when no style fields are present', () => {
    expect(parseNodeStyleData({ label: 'Node' })).toBeNull();
  });
});
