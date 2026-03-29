import React from 'react';
import type { Node } from '@/lib/reactflowCompat';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NodeData } from '@/lib/types';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { PropertySliderRow } from './PropertySliderRow';

interface NodeImageSettingsSectionProps {
    selectedNode: Node<NodeData>;
    isOpen: boolean;
    onToggle: () => void;
    onChange: (id: string, data: Partial<NodeData>) => void;
}

export function NodeImageSettingsSection({
    selectedNode,
    isOpen,
    onToggle,
    onChange,
}: NodeImageSettingsSectionProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <CollapsibleSection
            title={t('properties.imageSettings', 'Image Settings')}
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <PropertySliderRow
                label={t('properties.transparency', 'Transparency')}
                valueLabel={`${Math.round((1 - (selectedNode.data?.transparency ?? 1)) * 100)}%`}
                value={selectedNode.data?.transparency ?? 1}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(transparency) => onChange(selectedNode.id, { transparency })}
                containerClassName="mb-3 space-y-1"
            />

            <PropertySliderRow
                label={t('properties.rotation', 'Rotation')}
                valueLabel={`${selectedNode.data?.rotation ?? 0}°`}
                value={selectedNode.data?.rotation ?? 0}
                min={0}
                max={360}
                step={15}
                onChange={(rotation) => onChange(selectedNode.id, { rotation })}
                containerClassName="mb-2 space-y-1"
            />
        </CollapsibleSection>
    );
}
