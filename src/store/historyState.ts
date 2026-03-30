import type { FlowTab } from '@/lib/types';

export function createEmptyFlowHistory(): FlowTab['history'] {
  return {
    past: [],
    future: [],
  };
}
