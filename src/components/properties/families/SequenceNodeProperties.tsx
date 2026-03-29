import React from 'react';
import type { DiagramNodePropertiesComponentProps } from '@/diagram-types/core';
import { NodeProperties } from '@/components/properties/NodeProperties';
import { NodeActionButtons } from '@/components/properties/NodeActionButtons';
import { toggleSection } from '@/components/properties/shared';
import { SequenceNodeSection } from './SequenceNodeSection';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { InspectorSectionDivider } from '@/components/properties/InspectorPrimitives';
import { Users } from 'lucide-react';

export function SequenceNodeProperties({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
}: DiagramNodePropertiesComponentProps): React.ReactElement {
  const [activeSection, setActiveSection] = React.useState('participant');

  if (selectedNode.type !== 'sequence_participant') {
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
        title="Participant"
        icon={<Users className="w-3.5 h-3.5" />}
        isOpen={activeSection === 'participant'}
        onToggle={() => setActiveSection((current) => toggleSection(current, 'participant'))}
      >
        <SequenceNodeSection
          nodeId={selectedNode.id}
          data={selectedNode.data}
          onChange={onChange}
        />
      </CollapsibleSection>

      <NodeActionButtons nodeId={selectedNode.id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </>
  );
}
