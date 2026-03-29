import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { toggleSection } from '@/components/properties/shared';
import { JourneyNodeSection } from './JourneyNodeSection';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { InspectorSectionDivider } from '@/components/properties/InspectorPrimitives';
import { ColorPicker } from '@/components/properties/ColorPicker';
import { Footprints, Palette } from 'lucide-react';

export function JourneyNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('step');

  if (selectedNode.type !== 'journey') {
    return (
      <NodeProperties
        selectedNode={selectedNode}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
  }

  return (
    <>
      <InspectorSectionDivider />

      <CollapsibleSection
        title="Journey Step"
        icon={<Footprints className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'step'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'step'))}
      >
        <JourneyNodeSection nodeId={selectedNode.id} data={selectedNode.data} onChange={onChange} />
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

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
