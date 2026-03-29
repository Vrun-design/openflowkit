import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { toggleSection } from '@/components/properties/shared';
import { ClassNodeSection } from './ClassNodeSection';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { ColorPicker } from '@/components/properties/ColorPicker';
import {
  INSPECTOR_BUTTON_CLASSNAME,
  INSPECTOR_INPUT_COMPACT_CLASSNAME,
  InspectorField,
  InspectorSectionDivider,
} from '@/components/properties/InspectorPrimitives';
import { createPropertyInputKeyDownHandler } from '@/components/properties/propertyInputBehavior';
import { Braces, Code, Palette, Type } from 'lucide-react';

export function ClassDiagramNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onOpenMermaidCodeEditor,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('definition');

  if (selectedNode.type !== 'class') {
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
        title="Class Name"
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
            placeholder="Class name"
          />
        </InspectorField>
      </CollapsibleSection>

      <CollapsibleSection
        title="Definition"
        icon={<Braces className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'definition'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'definition'))}
      >
        <ClassNodeSection nodeId={selectedNode.id} data={selectedNode.data} onChange={onChange} />
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
        title="Code"
        icon={<Code className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'code'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'code'))}
      >
        <button
          type="button"
          className={`${INSPECTOR_BUTTON_CLASSNAME} w-full px-3 py-2 text-sm`}
          onClick={() => onOpenMermaidCodeEditor?.()}
        >
          Open Mermaid code
        </button>
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
