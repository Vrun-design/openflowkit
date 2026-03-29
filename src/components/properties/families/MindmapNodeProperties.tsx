import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { ColorPicker } from '@/components/properties/ColorPicker';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import {
  INSPECTOR_BUTTON_CLASSNAME,
  INSPECTOR_INPUT_COMPACT_CLASSNAME,
  InspectorField,
  InspectorSectionDivider,
} from '@/components/properties/InspectorPrimitives';
import { createPropertyInputKeyDownHandler } from '@/components/properties/propertyInputBehavior';
import { toggleSection } from '@/components/properties/shared';
import { SegmentedChoice } from '@/components/properties/SegmentedChoice';
import { Palette, Type, Workflow } from 'lucide-react';

function getDepth(selectedNode: DiagramNodePropertiesComponentProps['selectedNode']): number {
  return typeof selectedNode.data.mindmapDepth === 'number' ? selectedNode.data.mindmapDepth : 0;
}

export function MindmapNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onAddMindmapChild,
  onAddMindmapSibling,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('content');

  if (selectedNode.type !== 'mindmap') {
    return (
      <NodeProperties
        selectedNode={selectedNode}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
  }

  const depth = getDepth(selectedNode);
  const isRoot = depth === 0;
  const canAddSibling = Boolean(selectedNode.data.mindmapParentId && onAddMindmapSibling);
  const nodeRole = isRoot ? 'Root Topic' : `Branch (depth ${depth})`;
  const branchStyle = selectedNode.data.mindmapBranchStyle === 'straight' ? 'straight' : 'curved';
  const collapsed = selectedNode.data.mindmapCollapsed === true;
  const handleInputKeyDown = createPropertyInputKeyDownHandler({ blurOnEnter: true });

  return (
    <>
      <InspectorSectionDivider />

      <CollapsibleSection
        title="Content"
        icon={<Type className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'content'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'content'))}
      >
        <InspectorField label="Topic">
          <input
            value={selectedNode.data.label || ''}
            onChange={(event) => onChange(selectedNode.id, { label: event.target.value })}
            onKeyDown={handleInputKeyDown}
            className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
            placeholder="Mindmap topic"
          />
        </InspectorField>
      </CollapsibleSection>

      <CollapsibleSection
        title="Branch Color"
        icon={<Palette className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'appearance'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'appearance'))}
      >
        <p className="mb-3 text-xs text-[var(--brand-secondary)]">
          Applies the selected color to this topic and all of its descendants.
        </p>
        <ColorPicker
          selectedColor={selectedNode.data.color}
          selectedColorMode={selectedNode.data.colorMode}
          selectedCustomColor={selectedNode.data.customColor}
          onChange={(color) =>
            onChange(selectedNode.id, {
              color,
              ...(color === 'custom' ? {} : { customColor: undefined }),
            })
          }
          onColorModeChange={(colorMode) => onChange(selectedNode.id, { colorMode })}
          onCustomColorChange={(customColor) =>
            onChange(selectedNode.id, { color: 'custom', customColor })
          }
          allowModes={true}
          allowCustom={true}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Structure"
        icon={<Workflow className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'structure'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'structure'))}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--brand-background)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--brand-secondary)]">
              {nodeRole}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${INSPECTOR_BUTTON_CLASSNAME} px-3 py-2 text-sm`}
              onClick={() => onAddMindmapChild?.(selectedNode.id)}
            >
              Add Child Topic
            </button>
            <button
              type="button"
              disabled={!canAddSibling}
              className={`${INSPECTOR_BUTTON_CLASSNAME} px-3 py-2 text-sm`}
              onClick={() => onAddMindmapSibling?.(selectedNode.id)}
            >
              Add Sibling Topic
            </button>
          </div>

          {!isRoot ? (
            <button
              type="button"
              className={`${INSPECTOR_BUTTON_CLASSNAME} w-full px-3 py-2 text-sm`}
              onClick={() => onChange(selectedNode.id, { mindmapCollapsed: !collapsed })}
            >
              {collapsed ? 'Expand Branch' : 'Collapse Branch'}
            </button>
          ) : null}

          {isRoot ? (
            <InspectorField label="Branch Style">
              <SegmentedChoice
                columns={2}
                size="sm"
                selectedId={branchStyle}
                onSelect={(value) =>
                  onChange(selectedNode.id, {
                    mindmapBranchStyle: value as 'curved' | 'straight',
                  })
                }
                items={[
                  { id: 'curved', label: 'Curved' },
                  { id: 'straight', label: 'Straight' },
                ]}
              />
            </InspectorField>
          ) : null}
        </div>
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
