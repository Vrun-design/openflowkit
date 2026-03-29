import { Eye, EyeOff, Lock, LockOpen, Maximize2, FolderInput, ArrowUpRight } from 'lucide-react';
import React from 'react';

interface SectionAction {
  id: string;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
}

interface BuildSectionActionsParams {
  isSection: boolean;
  parentSectionId: string | undefined;
  nodeId: string;
  sectionHidden: boolean | undefined;
  sectionLocked: boolean | undefined;
  onFitSectionToContents?: (id: string) => void;
  onBringContentsIntoSection?: (id: string) => void;
  onReleaseFromSection?: (id: string) => void;
  onChange: (id: string, data: Record<string, unknown>) => void;
}

export function buildSectionActions({
  isSection,
  parentSectionId,
  nodeId,
  sectionHidden,
  sectionLocked,
  onFitSectionToContents,
  onBringContentsIntoSection,
  onReleaseFromSection,
  onChange,
}: BuildSectionActionsParams): SectionAction[] {
  if (isSection) {
    return [
      {
        id: 'fit-section',
        label: 'Fit Contents',
        icon: React.createElement(Maximize2, { className: 'w-4 h-4' }),
        onClick: () => onFitSectionToContents?.(nodeId),
      },
      {
        id: 'bring-into-section',
        label: 'Bring Inside',
        icon: React.createElement(FolderInput, { className: 'w-4 h-4' }),
        onClick: () => onBringContentsIntoSection?.(nodeId),
      },
      {
        id: 'toggle-hidden',
        label: sectionHidden ? 'Show Section' : 'Hide Section',
        icon: sectionHidden
          ? React.createElement(Eye, { className: 'w-4 h-4' })
          : React.createElement(EyeOff, { className: 'w-4 h-4' }),
        onClick: () => onChange(nodeId, { sectionHidden: sectionHidden !== true }),
      },
      {
        id: 'toggle-locked',
        label: sectionLocked ? 'Unlock Section' : 'Lock Section',
        icon: sectionLocked
          ? React.createElement(LockOpen, { className: 'w-4 h-4' })
          : React.createElement(Lock, { className: 'w-4 h-4' }),
        onClick: () => onChange(nodeId, { sectionLocked: sectionLocked !== true }),
      },
    ];
  }

  if (parentSectionId) {
    return [
      {
        id: 'release-from-section',
        label: 'Release',
        icon: React.createElement(ArrowUpRight, { className: 'w-4 h-4' }),
        onClick: () => onReleaseFromSection?.(nodeId),
      },
    ];
  }

  return [];
}
