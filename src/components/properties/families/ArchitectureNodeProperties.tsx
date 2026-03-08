import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { ColorPicker } from '@/components/properties/ColorPicker';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { useFlowStore } from '@/store';
import {
  INSPECTOR_BUTTON_CLASSNAME,
  INSPECTOR_INPUT_COMPACT_CLASSNAME,
  InspectorField,
  InspectorSectionDivider,
} from '@/components/properties/InspectorPrimitives';
import { Palette, ServerCog, Type } from 'lucide-react';

export function ArchitectureNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onAddArchitectureService,
  onCreateArchitectureBoundary,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const nodes = useFlowStore((state) => state.nodes);
  const [activeSection, setActiveSection] = React.useState('content');
  if (selectedNode.type !== 'architecture') {
    return (
      <NodeProperties
        selectedNode={selectedNode}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
  }
  const boundaryOptions = nodes.filter((node) => node.type === 'section');

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
        <InspectorField label="Resource Name">
          <input
            value={selectedNode.data.label || ''}
            onChange={(event) => onChange(selectedNode.id, { label: event.target.value })}
            className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
            placeholder="API Gateway"
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
        icon={<ServerCog className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'structure'}
        onToggle={() => toggleSection('structure')}
      >
        <div className="space-y-3">
          <InspectorField label="Provider">
            <input
              value={selectedNode.data.archProvider || ''}
              onChange={(event) => onChange(selectedNode.id, { archProvider: event.target.value })}
              className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
              placeholder="aws, azure, gcp, k8s, custom"
            />
          </InspectorField>

          <InspectorField label="Resource Type">
            <input
              value={selectedNode.data.archResourceType || ''}
              onChange={(event) => onChange(selectedNode.id, { archResourceType: event.target.value })}
              className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
              placeholder="service, database, queue, group"
            />
          </InspectorField>

          <div className="grid grid-cols-2 gap-2">
            <InspectorField label="Environment">
              <input
                value={selectedNode.data.archEnvironment || ''}
                onChange={(event) => onChange(selectedNode.id, { archEnvironment: event.target.value })}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
                placeholder="prod"
              />
            </InspectorField>
            <InspectorField
              label="Boundary"
              helper={(
                <div className="flex items-center justify-between gap-2">
                  <span>Boundary selection also updates containment.</span>
                  <button
                    type="button"
                    className={INSPECTOR_BUTTON_CLASSNAME}
                    onClick={() => onChange(selectedNode.id, { archBoundaryId: '' })}
                  >
                    Clear
                  </button>
                </div>
              )}
            >
              <select
                value={selectedNode.data.archBoundaryId || ''}
                onChange={(event) => onChange(selectedNode.id, { archBoundaryId: event.target.value })}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
              >
                <option value="">No boundary</option>
                {boundaryOptions.map((boundaryNode) => (
                  <option key={boundaryNode.id} value={boundaryNode.id}>
                    {boundaryNode.data?.label || boundaryNode.id}
                  </option>
                ))}
              </select>
            </InspectorField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InspectorField label="Zone">
              <input
                value={selectedNode.data.archZone || ''}
                onChange={(event) => onChange(selectedNode.id, { archZone: event.target.value })}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
                placeholder="public"
              />
            </InspectorField>
            <InspectorField label="Trust Domain">
              <input
                value={selectedNode.data.archTrustDomain || ''}
                onChange={(event) => onChange(selectedNode.id, { archTrustDomain: event.target.value })}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
                placeholder="internal"
              />
            </InspectorField>
          </div>

          <InspectorField label="Quick Semantics">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={INSPECTOR_BUTTON_CLASSNAME}
                onClick={() => onChange(selectedNode.id, { archZone: 'public' })}
              >
                Zone: Public
              </button>
              <button
                type="button"
                className={INSPECTOR_BUTTON_CLASSNAME}
                onClick={() => onChange(selectedNode.id, { archZone: 'private' })}
              >
                Zone: Private
              </button>
              <button
                type="button"
                className={INSPECTOR_BUTTON_CLASSNAME}
                onClick={() => onChange(selectedNode.id, { archTrustDomain: 'internal' })}
              >
                Trust: Internal
              </button>
              <button
                type="button"
                className={INSPECTOR_BUTTON_CLASSNAME}
                onClick={() => onChange(selectedNode.id, { archTrustDomain: 'external' })}
              >
                Trust: External
              </button>
            </div>
          </InspectorField>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${INSPECTOR_BUTTON_CLASSNAME} w-full px-3 py-2 text-sm`}
              onClick={() => onAddArchitectureService?.(selectedNode.id)}
            >
              Add Connected Service
            </button>

            <button
              type="button"
              className="w-full rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:border-violet-400"
              onClick={() => onCreateArchitectureBoundary?.(selectedNode.id)}
            >
              Create Boundary
            </button>
          </div>
        </div>
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
