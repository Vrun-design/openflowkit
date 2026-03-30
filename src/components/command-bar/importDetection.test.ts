import { describe, expect, it } from 'vitest';
import { detectInfraFormat } from './importDetection';

describe('importDetection', () => {
  it('detects terraform state from valid JSON shape', () => {
    expect(
      detectInfraFormat(
        'infra.json',
        JSON.stringify({
          version: 4,
          resources: [],
        })
      )
    ).toBe('terraform-state');
  });

  it('does not treat malformed JSON as terraform state by shape sniffing alone', () => {
    expect(
      detectInfraFormat(
        'infra.json',
        '{not-json'
      )
    ).toBe('terraform-state');
  });
});
