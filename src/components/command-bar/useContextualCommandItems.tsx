import React, { useMemo } from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownFromLine,
  ArrowRightFromLine,
  BringToFront,
  Replace,
  SendToBack,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import {
  listAvailableContextualCommands,
  type ContextualCommandDefinition,
} from '@/services/contextualEditorCommands';
import { useFlowStore } from '@/store';
import type { CommandItem } from './types';

interface CommandPresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: React.ReactNode;
}

function alignPresentation(
  direction: Extract<ContextualCommandDefinition['command'], { kind: 'align' }>['direction'],
  t: TFunction
): CommandPresentation {
  const presentations = {
    left: {
      label: t('common.alignLeft', 'Align Left'),
      icon: <AlignStartVertical className="h-4 w-4" />,
    },
    center: {
      label: t('common.alignCenter', 'Align Center'),
      icon: <AlignCenterVertical className="h-4 w-4" />,
    },
    right: {
      label: t('common.alignRight', 'Align Right'),
      icon: <AlignEndVertical className="h-4 w-4" />,
    },
    top: {
      label: t('common.alignTop', 'Align Top'),
      icon: <AlignStartHorizontal className="h-4 w-4" />,
    },
    middle: {
      label: t('common.alignMiddle', 'Align Middle'),
      icon: <AlignCenterHorizontal className="h-4 w-4" />,
    },
    bottom: {
      label: t('common.alignBottom', 'Align Bottom'),
      icon: <AlignEndHorizontal className="h-4 w-4" />,
    },
  } as const;
  return {
    ...presentations[direction],
    description: t('commandBar.contextual.alignDescription', 'Align two or more selected nodes'),
  };
}

function commandPresentation(
  definition: ContextualCommandDefinition,
  t: TFunction
): CommandPresentation {
  const { command } = definition;
  if (command.kind === 'align') return alignPresentation(command.direction, t);
  if (command.kind === 'distribute') {
    return command.direction === 'horizontal'
      ? {
          label: t('common.distributeHorizontally', 'Distribute Horizontally'),
          description: t(
            'commandBar.contextual.distributeDescription',
            'Space three or more selected nodes evenly'
          ),
          icon: <ArrowRightFromLine className="h-4 w-4" />,
        }
      : {
          label: t('common.distributeVertically', 'Distribute Vertically'),
          description: t(
            'commandBar.contextual.distributeDescription',
            'Space three or more selected nodes evenly'
          ),
          icon: <ArrowDownFromLine className="h-4 w-4" />,
        };
  }
  if (command.kind === 'z-order') {
    return command.direction === 'front'
      ? {
          label: t('common.bringToFront', 'Bring to Front'),
          description: t(
            'commandBar.contextual.nodeDescription',
            'Apply to currently selected nodes'
          ),
          icon: <BringToFront className="h-4 w-4" />,
        }
      : {
          label: t('common.sendToBack', 'Send to Back'),
          description: t(
            'commandBar.contextual.nodeDescription',
            'Apply to currently selected nodes'
          ),
          icon: <SendToBack className="h-4 w-4" />,
        };
  }
  return {
    label: t('common.reverseDirection', 'Reverse Direction'),
    description: t(
      'commandBar.contextual.connectorDescription',
      'Reverse currently selected connectors'
    ),
    icon: <Replace className="h-4 w-4" />,
  };
}

export function useContextualCommandItems(): CommandItem[] {
  const { t } = useTranslation();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const selectedEdgeId = useFlowStore((state) => state.selectedEdgeId);
  const runCommand = useFlowStore((state) => state.runContextualEditorCommand);

  return useMemo(() => {
    if (!ROLLOUT_FLAGS.openCanvasContextualCommandsV1) return [];
    const definitions = listAvailableContextualCommands({
      nodes,
      edges,
      selectedNodeId,
      selectedEdgeId,
    });
    return definitions.map((definition) => {
      const presentation = commandPresentation(definition, t);
      return {
        id: definition.id,
        label: presentation.label,
        description: presentation.description,
        icon: presentation.icon,
        keywords: definition.keywords,
        badge: t('commandBar.contextual.badge', 'Selection'),
        tier: 'core',
        type: 'action',
        hidden: true,
        action: () => {
          if (!runCommand(definition.command)) {
            throw new Error('Contextual command is no longer valid for the current selection.');
          }
        },
      };
    });
  }, [edges, nodes, runCommand, selectedEdgeId, selectedNodeId, t]);
}
