import React from 'react';
import {
  AppWindow,
  ArrowRightLeft,
  Boxes,
  Component,
  GitBranch,
  Group,
  Image as ImageIcon,
  LayoutList,
  Smartphone,
  StickyNote,
  Table2,
  Type,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { NodeData } from '@/lib/types';

export type AddItemId =
  | 'rectangle'
  | 'rounded'
  | 'capsule'
  | 'diamond'
  | 'hexagon'
  | 'cylinder'
  | 'circle'
  | 'sticky-note'
  | 'text'
  | 'section'
  | 'journey'
  | 'mindmap'
  | 'architecture'
  | 'sequence'
  | 'image'
  | 'class'
  | 'entity'
  | 'browser'
  | 'mobile';

export type AddItemSectionId = 'shapes' | 'diagrams' | 'wireframes' | 'other';
export type AddItemScope = 'toolbar' | 'assets';

export interface AddItemDefinition {
  id: AddItemId;
  label: string;
  section: AddItemSectionId;
  keywords: string[];
  scope: AddItemScope[];
  renderIcon: (className?: string) => React.ReactElement;
}

interface ShapeGlyphProps {
  shape: Extract<NodeData['shape'], 'rectangle' | 'rounded' | 'capsule' | 'diamond' | 'hexagon' | 'cylinder' | 'circle'>;
  className?: string;
}

const DEFAULT_TOOLBAR_ADD_ITEM_ID: AddItemId = 'rounded';

function ShapeGlyph({ shape, className }: ShapeGlyphProps): React.ReactElement {
  const resolvedClassName = className ?? 'h-5 w-5';
  const commonShapeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  function renderShape(): React.ReactNode {
    switch (shape) {
      case 'rectangle':
        return <rect x="12" y="26" width="76" height="48" rx="6" {...commonShapeProps} />;
      case 'rounded':
        return <rect x="18" y="18" width="64" height="64" rx="14" {...commonShapeProps} />;
      case 'capsule':
        return <rect x="10" y="24" width="80" height="52" rx="26" {...commonShapeProps} />;
      case 'diamond':
        return <polygon points="50,12 80,50 50,88 20,50" {...commonShapeProps} />;
      case 'hexagon':
        return <polygon points="30,14 70,14 84,50 70,86 30,86 16,50" {...commonShapeProps} />;
      case 'cylinder':
        return (
          <>
            <ellipse cx="50" cy="24" rx="22" ry="8" {...commonShapeProps} />
            <path
              d="M28 24 V72 C28 76 38 80 50 80 C62 80 72 76 72 72 V24"
              {...commonShapeProps}
            />
            <path
              d="M28 72 C28 76 38 80 50 80 C62 80 72 76 72 72"
              {...commonShapeProps}
            />
          </>
        );
      case 'circle':
        return <circle cx="50" cy="50" r="34" {...commonShapeProps} />;
      default:
        return null;
    }
  }

  return (
    <svg
      aria-hidden="true"
      className={resolvedClassName}
      viewBox="0 0 100 100"
      fill="none"
    >
      {renderShape()}
    </svg>
  );
}

function makeLucideIcon(Icon: React.ComponentType<{ className?: string }>): (className?: string) => React.ReactElement {
  return function renderLucideIcon(className?: string): React.ReactElement {
    return <Icon className={className ?? 'h-5 w-5'} />;
  };
}

function makeShapeIcon(
  shape: ShapeGlyphProps['shape'],
): (className?: string) => React.ReactElement {
  return function renderShapeIcon(className?: string): React.ReactElement {
    return <ShapeGlyph shape={shape} className={className} />;
  };
}

export function getAddItemSections(t: TFunction): Array<{ id: AddItemSectionId; title: string }> {
  return [
    { id: 'shapes', title: t('toolbar.shapes', 'Shapes') },
    { id: 'diagrams', title: t('toolbar.diagrams', 'Diagrams') },
    { id: 'wireframes', title: t('toolbar.wireframes', 'Wireframes') },
    { id: 'other', title: t('toolbar.other', 'Other') },
  ];
}

export function getAddItemDefinitions(t: TFunction): AddItemDefinition[] {
  return [
    {
      id: 'rectangle',
      label: 'Rectangle',
      section: 'shapes',
      keywords: ['rectangle', 'shape', 'box'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('rectangle'),
    },
    {
      id: 'rounded',
      label: 'Rounded',
      section: 'shapes',
      keywords: ['rounded', 'shape', 'box', 'square'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeShapeIcon('rounded'),
    },
    {
      id: 'capsule',
      label: 'Capsule',
      section: 'shapes',
      keywords: ['capsule', 'pill', 'shape'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('capsule'),
    },
    {
      id: 'diamond',
      label: 'Diamond',
      section: 'shapes',
      keywords: ['diamond', 'decision', 'shape'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('diamond'),
    },
    {
      id: 'hexagon',
      label: 'Hexagon',
      section: 'shapes',
      keywords: ['hexagon', 'shape'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('hexagon'),
    },
    {
      id: 'cylinder',
      label: 'Database',
      section: 'shapes',
      keywords: ['database', 'cylinder', 'storage', 'shape'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('cylinder'),
    },
    {
      id: 'circle',
      label: 'Circle',
      section: 'shapes',
      keywords: ['circle', 'shape'],
      scope: ['toolbar'],
      renderIcon: makeShapeIcon('circle'),
    },
    {
      id: 'class',
      label: 'Class',
      section: 'diagrams',
      keywords: ['class', 'uml', 'object', 'oop'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(LayoutList),
    },
    {
      id: 'entity',
      label: 'Entity',
      section: 'diagrams',
      keywords: ['entity', 'er', 'erd', 'table', 'database', 'schema'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Table2),
    },
    {
      id: 'mindmap',
      label: 'Mindmap',
      section: 'diagrams',
      keywords: ['mindmap', 'topic', 'brainstorm'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Component),
    },
    {
      id: 'journey',
      label: 'Journey',
      section: 'diagrams',
      keywords: ['journey', 'user flow', 'experience'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(GitBranch),
    },
    {
      id: 'architecture',
      label: 'Architecture',
      section: 'diagrams',
      keywords: ['architecture', 'service', 'system', 'cloud', 'c4'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Boxes),
    },
    {
      id: 'sequence',
      label: 'Sequence',
      section: 'diagrams',
      keywords: ['sequence', 'diagram', 'participant', 'message', 'uml', 'flow'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(ArrowRightLeft),
    },
    {
      id: 'browser',
      label: 'Browser',
      section: 'wireframes',
      keywords: ['browser', 'desktop', 'wireframe', 'web'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(AppWindow),
    },
    {
      id: 'mobile',
      label: 'Mobile',
      section: 'wireframes',
      keywords: ['mobile', 'device', 'wireframe', 'app'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Smartphone),
    },
    {
      id: 'sticky-note',
      label: t('toolbar.stickyNote', 'Sticky Note'),
      section: 'other',
      keywords: ['sticky note', 'note', 'comment', 'annotation'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(StickyNote),
    },
    {
      id: 'section',
      label: t('toolbar.section', 'Section'),
      section: 'other',
      keywords: ['section', 'group', 'container'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Group),
    },
    {
      id: 'text',
      label: t('toolbar.text', 'Text'),
      section: 'other',
      keywords: ['text', 'label', 'heading'],
      scope: ['toolbar', 'assets'],
      renderIcon: makeLucideIcon(Type),
    },
    {
      id: 'image',
      label: t('toolbar.image', 'Image'),
      section: 'other',
      keywords: ['image', 'media', 'upload', 'screenshot'],
      scope: ['assets'],
      renderIcon: makeLucideIcon(ImageIcon),
    },
  ];
}

export function getAddItemsForScope(scope: AddItemScope, t: TFunction): AddItemDefinition[] {
  return getAddItemDefinitions(t).filter((item) => item.scope.includes(scope));
}

export function getAddItemDefinitionById(id: AddItemId, t: TFunction): AddItemDefinition {
  const definition = getAddItemDefinitions(t).find((item) => item.id === id);

  if (!definition) {
    throw new Error(`Unknown add item id: ${id}`);
  }

  return definition;
}

export interface AddItemActions {
  onAddShape: (shape: NodeData['shape'], position?: { x: number; y: number }) => void;
  onAddAnnotation: (position?: { x: number; y: number }) => void;
  onAddSection: (position?: { x: number; y: number }) => void;
  onAddTextNode: (position?: { x: number; y: number }) => void;
  onAddClassNode: (position?: { x: number; y: number }) => void;
  onAddEntityNode: (position?: { x: number; y: number }) => void;
  onAddMindmapNode: (position?: { x: number; y: number }) => void;
  onAddJourneyNode: (position?: { x: number; y: number }) => void;
  onAddArchitectureNode: (position?: { x: number; y: number }) => void;
  onAddSequenceParticipant: (position?: { x: number; y: number }) => void;
  onAddWireframe: (variant: 'browser' | 'mobile', position?: { x: number; y: number }) => void;
  onRequestImageUpload?: () => void;
}

export function executeAddItem(
  id: AddItemId,
  actions: AddItemActions,
  position?: { x: number; y: number },
): void {
  switch (id) {
    case 'rectangle':
    case 'rounded':
    case 'capsule':
    case 'diamond':
    case 'hexagon':
    case 'cylinder':
    case 'circle':
      actions.onAddShape(id, position);
      return;
    case 'sticky-note':
      actions.onAddAnnotation(position);
      return;
    case 'text':
      actions.onAddTextNode(position);
      return;
    case 'section':
      actions.onAddSection(position);
      return;
    case 'journey':
      actions.onAddJourneyNode(position);
      return;
    case 'mindmap':
      actions.onAddMindmapNode(position);
      return;
    case 'architecture':
      actions.onAddArchitectureNode(position);
      return;
    case 'sequence':
      actions.onAddSequenceParticipant(position);
      return;
    case 'image':
      actions.onRequestImageUpload?.();
      return;
    case 'class':
      actions.onAddClassNode(position);
      return;
    case 'entity':
      actions.onAddEntityNode(position);
      return;
    case 'browser':
      actions.onAddWireframe('browser', position);
      return;
    case 'mobile':
      actions.onAddWireframe('mobile', position);
      return;
    default: {
      const exhaustiveCheck: never = id;
      throw new Error(`Unhandled add item id: ${exhaustiveCheck}`);
    }
  }
}

export function getDefaultToolbarAddItemId(): AddItemId {
  return DEFAULT_TOOLBAR_ADD_ITEM_ID;
}
