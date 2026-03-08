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

  function toggleSection(section: string): void {
    setActiveSection((currentSection) => (currentSection === section ? '' : section));
  }

  return (
    <>
      <InspectorSectionDivider />

      <CollapsibleSection
        title="Content"
        icon={<Type className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'content'}
        onToggle={() => toggleSection('content')}
      >
        <InspectorField label="Topic">
          <input
            value={selectedNode.data.label || ''}
            onChange={(event) => onChange(selectedNode.id, { label: event.target.value })}
            className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
            placeholder="Mindmap topic"
          />
        </InspectorField>
      </CollapsibleSection>

      <CollapsibleSection
        title="Color"
        icon={<Palette className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'appearance'}
        onToggle={() => toggleSection('appearance')}
      >
        <ColorPicker
          selectedColor={selectedNode.data.color}
          selectedColorMode={selectedNode.data.colorMode}
          selectedCustomColor={selectedNode.data.customColor}
          onChange={(color) => onChange(selectedNode.id, {
            color,
            ...(color === 'custom' ? {} : { customColor: undefined }),
          })}
          onColorModeChange={(colorMode) => onChange(selectedNode.id, { colorMode })}
          onCustomColorChange={(customColor) => onChange(selectedNode.id, { color: 'custom', customColor })}
          allowModes={true}
          allowCustom={true}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Structure"
        icon={<Workflow className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'structure'}
        onToggle={() => toggleSection('structure')}
      >
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hierarchy</div>
            <div className="mt-1 text-sm text-slate-700">{nodeRole}</div>
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
              className={`${INSPECTOR_BUTTON_CLASSNAME} px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45`}
              onClick={() => onAddMindmapSibling?.(selectedNode.id)}
            >
              Add Sibling Topic
            </button>
          </div>

          {isRoot ? (
            <InspectorField label="Branch Style">
              <SegmentedChoice
                columns={2}
                size="sm"
                selectedId={branchStyle}
                onSelect={(value) => onChange(selectedNode.id, {
                  mindmapBranchStyle: value as 'curved' | 'straight',
                })}
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
