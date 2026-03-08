import React, { useMemo, useState } from 'react';
import type { Node } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { Box, Palette, Star, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { Button } from '../ui/Button';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import {
    INSPECTOR_INPUT_CLASSNAME,
    InspectorField,
    InspectorFooter,
    InspectorIntro,
    InspectorSectionDivider,
    InspectorSummaryCard,
} from './InspectorPrimitives';

interface BulkNodePropertiesProps {
    selectedNodes: Node<NodeData>[];
    onApply: (updates: Partial<NodeData>, labelPrefix?: string, labelSuffix?: string) => number;
}

function buildBulkUpdates(
    shape: NodeData['shape'] | '',
    color: string,
    colorMode: NodeData['colorMode'],
    customColor: string | undefined,
    icon: string,
    customIconUrl: string | undefined
): Partial<NodeData> {
    const updates: Partial<NodeData> = {};
    if (shape) updates.shape = shape;
    if (color) updates.color = color;
    if (colorMode) updates.colorMode = colorMode;
    if (customColor && color === 'custom') updates.customColor = customColor;
    if (icon) updates.icon = icon;
    if (customIconUrl) updates.customIconUrl = customIconUrl;
    return updates;
}

function buildChangeSummary(
    shape: NodeData['shape'] | '',
    color: string,
    colorMode: NodeData['colorMode'],
    customColor: string | undefined,
    icon: string,
    customIconUrl: string | undefined,
    labelPrefix: string,
    labelSuffix: string
): string[] {
    const updates: string[] = [];
    if (shape) updates.push(`shape: ${shape}`);
    if (color) updates.push(`color: ${color === 'custom' && customColor ? `${customColor} (${colorMode || 'subtle'})` : `${color}${colorMode ? ` (${colorMode})` : ''}`}`);
    if (icon) updates.push(`icon: ${icon}`);
    if (customIconUrl) updates.push('custom icon: uploaded image');
    if (labelPrefix) updates.push(`label prefix: "${labelPrefix}"`);
    if (labelSuffix) updates.push(`label suffix: "${labelSuffix}"`);
    return updates;
}

export function BulkNodeProperties({ selectedNodes, onApply }: BulkNodePropertiesProps): React.ReactElement {
    const { t } = useTranslation();
    const [shape, setShape] = useState<NodeData['shape'] | ''>('');
    const [color, setColor] = useState<string>('');
    const [colorMode, setColorMode] = useState<NodeData['colorMode']>('subtle');
    const [customColor, setCustomColor] = useState<string | undefined>(undefined);
    const [icon, setIcon] = useState<string>('');
    const [customIconUrl, setCustomIconUrl] = useState<string | undefined>(undefined);
    const [labelPrefix, setLabelPrefix] = useState('');
    const [labelSuffix, setLabelSuffix] = useState('');
    const [activeSection, setActiveSection] = useState('shape');

    const changeSummary = useMemo(
        () => buildChangeSummary(shape, color, colorMode, customColor, icon, customIconUrl, labelPrefix, labelSuffix),
        [shape, color, colorMode, customColor, icon, customIconUrl, labelPrefix, labelSuffix]
    );

    const hasChanges = changeSummary.length > 0;

    function handleApply(): void {
        if (!hasChanges) {
            return;
        }

        const updates = buildBulkUpdates(shape, color, colorMode, customColor, icon, customIconUrl);
        onApply(updates, labelPrefix, labelSuffix);
        setLabelPrefix('');
        setLabelSuffix('');
    }

    function toggleSection(section: string): void {
        setActiveSection((currentSection) => currentSection === section ? '' : section);
    }

    return (
        <>
            <InspectorSectionDivider />

            <InspectorIntro>
                {selectedNodes.length} nodes selected. Configure shared updates and apply in one history step.
            </InspectorIntro>

            <CollapsibleSection
                title={t('properties.bulkShape', 'Bulk Shape')}
                icon={<Box className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'shape'}
                onToggle={() => toggleSection('shape')}
            >
                <ShapeSelector selectedShape={shape || undefined} onChange={setShape} />
            </CollapsibleSection>

            <CollapsibleSection
                title={t('properties.bulkColor', 'Bulk Color')}
                icon={<Palette className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'color'}
                onToggle={() => toggleSection('color')}
            >
                <ColorPicker
                    selectedColor={color || undefined}
                    selectedColorMode={colorMode}
                    selectedCustomColor={customColor}
                    onChange={(nextColor) => {
                        setColor(nextColor);
                        if (nextColor !== 'custom') {
                            setCustomColor(undefined);
                        }
                    }}
                    onColorModeChange={setColorMode}
                    onCustomColorChange={setCustomColor}
                    allowModes={true}
                    allowCustom={true}
                />
            </CollapsibleSection>

            <CollapsibleSection
                title={t('properties.bulkIcon', 'Bulk Icon')}
                icon={<Star className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'icon'}
                onToggle={() => toggleSection('icon')}
            >
                <IconPicker
                    selectedIcon={icon || undefined}
                    onChange={setIcon}
                    customIconUrl={customIconUrl}
                    onCustomIconChange={setCustomIconUrl}
                />
            </CollapsibleSection>

            <CollapsibleSection
                title={t('properties.labelTransform', 'Label Transform')}
                icon={<Type className="w-3.5 h-3.5" />}
                isOpen={activeSection === 'labels'}
                onToggle={() => toggleSection('labels')}
            >
                <div className="space-y-2">
                    <InspectorField label={t('properties.prefixOptional', 'Prefix (optional)')}>
                        <input
                            value={labelPrefix}
                            onChange={(event) => setLabelPrefix(event.target.value)}
                            placeholder={t('properties.prefixOptional', 'Prefix (optional)')}
                            className={INSPECTOR_INPUT_CLASSNAME}
                        />
                    </InspectorField>
                    <InspectorField label={t('properties.suffixOptional', 'Suffix (optional)')}>
                        <input
                            value={labelSuffix}
                            onChange={(event) => setLabelSuffix(event.target.value)}
                            placeholder={t('properties.suffixOptional', 'Suffix (optional)')}
                            className={INSPECTOR_INPUT_CLASSNAME}
                        />
                    </InspectorField>
                </div>
            </CollapsibleSection>

            <InspectorFooter className="space-y-4">
                <InspectorSummaryCard>
                    <div className="text-xs font-semibold text-slate-600">
                        {t('properties.previewSummary', 'Preview summary')}
                    </div>
                    {hasChanges ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                            <li>{t('properties.bulkApplySummary', 'Will update {{count}} selected nodes', { count: selectedNodes.length })}</li>
                            {changeSummary.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-2 text-xs text-slate-500">
                            {t('properties.selectFieldToApply', 'Select at least one field to apply.')}
                        </p>
                    )}
                </InspectorSummaryCard>

                <Button
                    onClick={handleApply}
                    disabled={!hasChanges}
                    variant="primary"
                    className="w-full"
                >
                    {t('properties.applyToSelectedNodes', 'Apply to selected nodes')}
                </Button>
            </InspectorFooter>
        </>
    );
}
