import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/ai-generation/graphComposer', () => ({
  parseDslOrThrow: vi.fn(),
}));

import { parseDslOrThrow } from '@/hooks/ai-generation/graphComposer';
import { parseInfraDslApplyInput } from './infraDslApply';

describe('parseInfraDslApplyInput', () => {
  it('returns parsed nodes and edges on success', () => {
    vi.mocked(parseDslOrThrow).mockReturnValue({
      nodes: [{ id: 'node-1' }] as never,
      edges: [{ id: 'edge-1' }] as never,
    });

    const result = parseInfraDslApplyInput('flow: Test');

    expect(result).toEqual({
      status: 'success',
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-1' }],
    });
  });

  it('returns a user-facing error on parse failure', () => {
    vi.mocked(parseDslOrThrow).mockImplementation(() => {
      throw new Error('Line 4: expected node definition');
    });

    const result = parseInfraDslApplyInput('invalid');

    expect(result).toEqual({
      status: 'error',
      message: 'Line 4: expected node definition',
    });
  });
});
