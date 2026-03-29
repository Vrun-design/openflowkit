import React from 'react';
import { Plus } from 'lucide-react';
import { requestNodeQuickCreate, type QuickCreateDirection } from '@/hooks/nodeQuickCreateRequest';

interface NodeQuickCreateButtonsProps {
  nodeId: string;
  visible: boolean;
}

const BUTTON_POSITIONS: Record<QuickCreateDirection, string> = {
  up: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
  right: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
  down: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
};

export function NodeQuickCreateButtons({
  nodeId,
  visible,
}: NodeQuickCreateButtonsProps): React.ReactElement | null {
  if (!visible) {
    return null;
  }

  return (
    <>
      {(Object.keys(BUTTON_POSITIONS) as QuickCreateDirection[]).map((direction) => (
        <button
          key={direction}
          type="button"
          aria-label={`Quick create ${direction}`}
          onClick={(event) => {
            event.stopPropagation();
            requestNodeQuickCreate(nodeId, direction);
          }}
          className={`absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] shadow-md transition-colors hover:border-sky-300 hover:text-sky-700 ${BUTTON_POSITIONS[direction]}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      ))}
    </>
  );
}
