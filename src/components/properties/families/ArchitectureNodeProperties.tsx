import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { ColorPicker } from '@/components/properties/ColorPicker';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Select } from '@/components/ui/Select';
import {
  INSPECTOR_INPUT_COMPACT_CLASSNAME,
  InspectorField,
  InspectorSectionDivider,
} from '@/components/properties/InspectorPrimitives';
import { createPropertyInputKeyDownHandler } from '@/components/properties/propertyInputBehavior';
import { toggleSection } from '@/components/properties/shared';
import { Palette, ServerCog, Type } from 'lucide-react';
import { ArchitectureNodeSection } from './ArchitectureNodeSection';
import { ENVIRONMENT_OPTIONS, RESOURCE_TYPE_OPTIONS } from './architectureOptions';

export function ArchitectureNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('architecture');
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
  const handleInputKeyDown = createPropertyInputKeyDownHandler({ blurOnEnter: true });

  return (
    <>
      <InspectorSectionDivider />

      <CollapsibleSection
        title="Service"
        icon={<Type className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'architecture'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'architecture'))}
      >
        <ArchitectureNodeSection
          nodeId={selectedNode.id}
          data={selectedNode.data}
          onChange={onChange}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Color"
        icon={<Palette className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'appearance'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'appearance'))}
      >
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
        title="Deployment"
        icon={<ServerCog className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'structure'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'structure'))}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <InspectorField label="Environment">
              <Select
                value={String(selectedNode.data.archEnvironment || 'default')}
                onChange={(value) => onChange(selectedNode.id, { archEnvironment: value })}
                options={ENVIRONMENT_OPTIONS}
                placeholder="Select environment"
              />
            </InspectorField>
            <InspectorField label="Resource Type">
              <Select
                value={String(selectedNode.data.archResourceType || 'service')}
                onChange={(value) => onChange(selectedNode.id, { archResourceType: value })}
                options={RESOURCE_TYPE_OPTIONS}
                placeholder="Select resource type"
              />
            </InspectorField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InspectorField label="Zone">
              <input
                value={selectedNode.data.archZone || ''}
                onChange={(event) => onChange(selectedNode.id, { archZone: event.target.value })}
                onKeyDown={handleInputKeyDown}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
                placeholder="e.g. us-east-1"
              />
            </InspectorField>
            <InspectorField label="Trust Domain">
              <input
                value={selectedNode.data.archTrustDomain || ''}
                onChange={(event) =>
                  onChange(selectedNode.id, { archTrustDomain: event.target.value })
                }
                onKeyDown={handleInputKeyDown}
                className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
                placeholder="e.g. internal"
              />
            </InspectorField>
          </div>
        </div>
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
