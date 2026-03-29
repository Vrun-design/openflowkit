import React from 'react';
import type { NodeData } from '@/lib/types';
import { ClassMemberListEditor } from './ClassMemberListEditor';
import { createPropertyInputKeyDownHandler } from '@/components/properties/propertyInputBehavior';
import { INSPECTOR_INPUT_COMPACT_CLASSNAME } from '@/components/properties/InspectorPrimitives';

interface ClassNodeSectionProps {
  nodeId: string;
  data: NodeData;
  onChange: (id: string, data: Partial<NodeData>) => void;
}

function normalizeItems(items: string[] | undefined): string[] {
  return Array.isArray(items) ? items : [];
}

export function ClassNodeSection({ nodeId, data, onChange }: ClassNodeSectionProps): React.ReactElement {
  const handleInputKeyDown = createPropertyInputKeyDownHandler({ blurOnEnter: true });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-[var(--brand-secondary)]">Stereotype</label>
        <input
          value={data.classStereotype || ''}
          onChange={(event) => onChange(nodeId, { classStereotype: event.target.value })}
          onKeyDown={handleInputKeyDown}
          className={INSPECTOR_INPUT_COMPACT_CLASSNAME}
          placeholder="interface, abstract, service..."
        />
      </div>

      <ClassMemberListEditor
        title="Attributes"
        items={normalizeItems(data.classAttributes)}
        placeholder="+ id: UUID"
        addLabel="+ Add attribute"
        onChange={(items) => onChange(nodeId, { classAttributes: items })}
      />

      <ClassMemberListEditor
        title="Methods"
        items={normalizeItems(data.classMethods)}
        placeholder="+ save(): void"
        addLabel="+ Add method"
        onChange={(items) => onChange(nodeId, { classMethods: items })}
      />
    </div>
  );
}
