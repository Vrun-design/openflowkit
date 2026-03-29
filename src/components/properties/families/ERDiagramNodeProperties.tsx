import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { toggleSection } from '@/components/properties/shared';
import { EntityNodeSection } from './EntityNodeSection';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { ColorPicker } from '@/components/properties/ColorPicker';
import {
  INSPECTOR_BUTTON_CLASSNAME,
  INSPECTOR_INPUT_COMPACT_CLASSNAME,
  InspectorField,
  InspectorSectionDivider,
} from '@/components/properties/InspectorPrimitives';
import { createPropertyInputKeyDownHandler } from '@/components/properties/propertyInputBehavior';
import { Code, Palette, Table, Type } from 'lucide-react';

export function ERDiagramNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onGenerateEntityFields,
  onConvertEntitySelectionToClassDiagram,
  onOpenMermaidCodeEditor,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('fields');

  if (selectedNode.type !== 'er_entity') {
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
        title="Entity Name"
        icon={<Type className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'name'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'name'))}
      >
        <InspectorField label="Name">
          <input
            value={selectedNode.data.label || ''}
            onChange={(event) => onChange(selectedNode.id, { label: event.target.value })}
            onKeyDown={handleInputKeyDown}
            className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
            placeholder="Entity name"
          />
        </InspectorField>
      </CollapsibleSection>

      <CollapsibleSection
        title="Fields"
        icon={<Table className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'fields'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'fields'))}
      >
        <EntityNodeSection
          nodeId={selectedNode.id}
          data={selectedNode.data}
          onChange={onChange}
          onGenerateEntityFields={onGenerateEntityFields}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Color"
        icon={<Palette className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'color'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'color'))}
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
        title="Actions"
        icon={<Code className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'actions'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'actions'))}
      >
        <div className="space-y-2">
          <button
            type="button"
            className={`${INSPECTOR_BUTTON_CLASSNAME} w-full px-3 py-2 text-sm`}
            onClick={() => onConvertEntitySelectionToClassDiagram?.()}
          >
            Convert to class diagram
          </button>
          <button
            type="button"
            className={`${INSPECTOR_BUTTON_CLASSNAME} w-full px-3 py-2 text-sm`}
            onClick={() => onOpenMermaidCodeEditor?.()}
          >
            Open Mermaid code
          </button>
        </div>
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
