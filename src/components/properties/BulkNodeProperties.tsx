import React, { useMemo, useState } from 'react';
import type { Node } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import {
  getBulkAffectedNodeCount,
  getBulkSelectionFamilySummary,
  getScopedSectionTitle,
} from '@/lib/nodeBulkEditing';
import { Box, Palette, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker, type ProviderIconSelection } from './IconPicker';
import {
  InspectorFooter,
  InspectorIntro,
  InspectorSectionDivider,
  InspectorSummaryCard,
} from './InspectorPrimitives';
import { createPropertyInputKeyDownHandler } from './propertyInputBehavior';
import { getWireframeVariants } from './wireframeVariants';
import {
  ArchitectureBulkSection,
  ClassBulkSection,
  FindReplaceBulkSection,
  JourneyBulkSection,
  LabelTransformBulkSection,
  SelectionSummary,
  SequenceBulkSection,
  WireframeVariantBulkSection,
} from './BulkNodePropertiesSections';
import {
  buildBulkUpdates,
  buildChangeSummary,
  buildLabelOptions,
  getAvailableBulkSections,
  getBulkCapabilityCounts,
  INITIAL_BULK_NODE_PROPERTIES_FORM_STATE,
  resetBulkLabelTransformFields,
  type BulkSectionId,
  type BulkNodePropertiesFormState,
} from './bulkNodePropertiesModel';

interface BulkNodePropertiesProps {
  selectedNodes: Node<NodeData>[];
  onApply: (
    updates: Partial<NodeData>,
    labelPrefix?: string,
    labelSuffix?: string,
    labelFindReplace?: { find: string; replace: string; useRegex: boolean }
  ) => number;
}

export function BulkNodeProperties({
  selectedNodes,
  onApply,
}: BulkNodePropertiesProps): React.ReactElement {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL_BULK_NODE_PROPERTIES_FORM_STATE);
  const [activeSection, setActiveSection] = useState<BulkSectionId>('shape');
  const handleInputKeyDown = createPropertyInputKeyDownHandler({ blurOnEnter: true });

  const capabilityCounts = useMemo(() => getBulkCapabilityCounts(selectedNodes), [selectedNodes]);

  const familySummary = useMemo(
    () => getBulkSelectionFamilySummary(selectedNodes),
    [selectedNodes]
  );

  const allowAdvancedColorControls =
    capabilityCounts.advancedColor === capabilityCounts.color && capabilityCounts.color > 0;

  const wireframeVariantOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

    for (const node of selectedNodes) {
      if (node.type !== 'browser' && node.type !== 'mobile') {
        continue;
      }

      for (const option of getWireframeVariants(node.type)) {
        optionMap.set(option.id, option.label);
      }
    }

    return Array.from(optionMap.entries()).map(([id, label]) => ({ id, label }));
  }, [selectedNodes]);

  const updates = useMemo(
    () => buildBulkUpdates(form, allowAdvancedColorControls),
    [form, allowAdvancedColorControls]
  );

  const labelOptions = useMemo(() => buildLabelOptions(form), [form]);
  const changeSummary = useMemo(
    () => buildChangeSummary(selectedNodes, updates, labelOptions),
    [selectedNodes, updates, labelOptions]
  );

  const hasChanges = changeSummary.length > 0;
  const affectedNodeCount = getBulkAffectedNodeCount(selectedNodes, updates, labelOptions);
  const availableSections = getAvailableBulkSections({
    shape: capabilityCounts.shape,
    color: capabilityCounts.color,
    icon: capabilityCounts.icon,
    variant: capabilityCounts.variant,
    architecture: capabilityCounts.architecture,
    journey: capabilityCounts.journey,
    class: capabilityCounts.class,
    sequence: capabilityCounts.sequence,
    labels: selectedNodes.length,
    findReplace: selectedNodes.length,
  });
  const resolvedActiveSection = availableSections.includes(activeSection)
    ? activeSection
    : availableSections[0] ?? 'labels';

  function updateForm<K extends keyof BulkNodePropertiesFormState>(
    key: K,
    value: BulkNodePropertiesFormState[K]
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSection(section: BulkSectionId): void {
    setActiveSection((currentSection) => (currentSection === section ? '' : section));
  }

  function handleApply(): void {
    if (!hasChanges) {
      return;
    }

    onApply(updates, form.labelPrefix, form.labelSuffix, labelOptions.labelFindReplace);
    setForm((current) => resetBulkLabelTransformFields(current));
  }

  function handleBuiltInIconChange(nextIcon: string): void {
    setForm((current) => ({
      ...current,
      iconMode: 'built-in',
      icon: nextIcon,
      customIconUrl: undefined,
      assetProvider: undefined,
      assetCategory: undefined,
      archIconPackId: undefined,
      archIconShapeId: undefined,
    }));
  }

  function handleProviderIconChange(selection: ProviderIconSelection): void {
    setForm((current) => ({
      ...current,
      iconMode: 'provider',
      icon: '',
      customIconUrl: undefined,
      assetProvider: selection.provider,
      assetCategory: selection.category,
      archIconPackId: selection.packId,
      archIconShapeId: selection.shapeId,
    }));
  }

  function handleCustomIconChange(url?: string): void {
    setForm((current) => ({
      ...current,
      iconMode: url ? 'upload' : '',
      icon: '',
      customIconUrl: url,
      assetProvider: undefined,
      assetCategory: undefined,
      archIconPackId: undefined,
      archIconShapeId: undefined,
    }));
  }

  return (
    <>
      <InspectorSectionDivider />

      <InspectorIntro>
        {selectedNodes.length} nodes selected. Shared controls apply to everything, while scoped
        controls only touch compatible nodes.
      </InspectorIntro>

      <SelectionSummary familySummary={familySummary} />

      {capabilityCounts.shape > 0 ? (
        <CollapsibleSection
          title={getScopedSectionTitle(
            t('properties.bulkShape', 'Bulk Shape'),
            capabilityCounts.shape,
            selectedNodes.length
          )}
          icon={<Box className="w-3.5 h-3.5" />}
          isOpen={resolvedActiveSection === 'shape'}
          onToggle={() => toggleSection('shape')}
        >
          <ShapeSelector
            selectedShape={form.shape || undefined}
            onChange={(shape) => updateForm('shape', shape)}
          />
        </CollapsibleSection>
      ) : null}

      {capabilityCounts.color > 0 ? (
        <CollapsibleSection
          title={getScopedSectionTitle(
            t('properties.bulkColor', 'Bulk Color'),
            capabilityCounts.color,
            selectedNodes.length
          )}
          icon={<Palette className="w-3.5 h-3.5" />}
          isOpen={resolvedActiveSection === 'color'}
          onToggle={() => toggleSection('color')}
        >
          <ColorPicker
            selectedColor={form.color || undefined}
            selectedColorMode={form.colorMode}
            selectedCustomColor={form.customColor}
            onChange={(nextColor) => {
              updateForm('color', nextColor);
              if (nextColor !== 'custom') {
                updateForm('customColor', undefined);
              }
            }}
            onColorModeChange={
              allowAdvancedColorControls ? (colorMode) => updateForm('colorMode', colorMode) : undefined
            }
            onCustomColorChange={
              allowAdvancedColorControls
                ? (customColor) => updateForm('customColor', customColor)
                : undefined
            }
            allowModes={allowAdvancedColorControls}
            allowCustom={allowAdvancedColorControls}
          />
        </CollapsibleSection>
      ) : null}

      {capabilityCounts.icon > 0 ? (
        <CollapsibleSection
          title={getScopedSectionTitle(
            t('properties.bulkIcon', 'Bulk Icon'),
            capabilityCounts.icon,
            selectedNodes.length
          )}
          icon={<Star className="w-3.5 h-3.5" />}
          isOpen={resolvedActiveSection === 'icon'}
          onToggle={() => toggleSection('icon')}
        >
          <IconPicker
            selectedIcon={form.icon || undefined}
            customIconUrl={form.customIconUrl}
            selectedProvider={form.assetProvider}
            selectedProviderCategory={form.assetCategory}
            selectedProviderPackId={form.archIconPackId}
            selectedProviderShapeId={form.archIconShapeId}
            onSelectBuiltInIcon={handleBuiltInIconChange}
            onSelectProviderIcon={handleProviderIconChange}
            onCustomIconChange={handleCustomIconChange}
          />
        </CollapsibleSection>
      ) : null}

      {capabilityCounts.variant > 0 ? (
        <WireframeVariantBulkSection
          title={getScopedSectionTitle(
            'Wireframe Variant',
            capabilityCounts.variant,
            selectedNodes.length
          )}
          isOpen={resolvedActiveSection === 'variant'}
          onToggle={() => toggleSection('variant')}
          options={wireframeVariantOptions}
          value={form.variant}
          onChange={(value) => updateForm('variant', value)}
        />
      ) : null}

      {capabilityCounts.architecture > 0 ? (
        <ArchitectureBulkSection
          title={getScopedSectionTitle(
            'Architecture Deployment',
            capabilityCounts.architecture,
            selectedNodes.length
          )}
          isOpen={resolvedActiveSection === 'architecture'}
          onToggle={() => toggleSection('architecture')}
          archEnvironment={form.archEnvironment}
          archResourceType={form.archResourceType}
          archZone={form.archZone}
          archTrustDomain={form.archTrustDomain}
          onEnvironmentChange={(value) => updateForm('archEnvironment', value)}
          onResourceTypeChange={(value) => updateForm('archResourceType', value)}
          onZoneChange={(value) => updateForm('archZone', value)}
          onTrustDomainChange={(value) => updateForm('archTrustDomain', value)}
          onInputKeyDown={handleInputKeyDown}
        />
      ) : null}

      {capabilityCounts.journey > 0 ? (
        <JourneyBulkSection
          title={getScopedSectionTitle('Journey Step', capabilityCounts.journey, selectedNodes.length)}
          isOpen={resolvedActiveSection === 'journey'}
          onToggle={() => toggleSection('journey')}
          journeySection={form.journeySection}
          journeyScore={form.journeyScore}
          onJourneySectionChange={(value) => updateForm('journeySection', value)}
          onJourneyScoreChange={(value) => updateForm('journeyScore', value)}
          onInputKeyDown={handleInputKeyDown}
        />
      ) : null}

      {capabilityCounts.class > 0 ? (
        <ClassBulkSection
          title={getScopedSectionTitle('Class Definition', capabilityCounts.class, selectedNodes.length)}
          isOpen={resolvedActiveSection === 'class'}
          onToggle={() => toggleSection('class')}
          classStereotype={form.classStereotype}
          onChange={(value) => updateForm('classStereotype', value)}
          onInputKeyDown={handleInputKeyDown}
        />
      ) : null}

      {capabilityCounts.sequence > 0 ? (
        <SequenceBulkSection
          title={getScopedSectionTitle('Participant', capabilityCounts.sequence, selectedNodes.length)}
          isOpen={resolvedActiveSection === 'sequence'}
          onToggle={() => toggleSection('sequence')}
          sequenceAlias={form.sequenceAlias}
          onChange={(value) => updateForm('sequenceAlias', value)}
          onInputKeyDown={handleInputKeyDown}
        />
      ) : null}

      <LabelTransformBulkSection
        title={t('properties.labelTransform', 'Label Transform')}
        isOpen={resolvedActiveSection === 'labels'}
        onToggle={() => toggleSection('labels')}
        labelPrefix={form.labelPrefix}
        labelSuffix={form.labelSuffix}
        onLabelPrefixChange={(value) => updateForm('labelPrefix', value)}
        onLabelSuffixChange={(value) => updateForm('labelSuffix', value)}
        onInputKeyDown={handleInputKeyDown}
      />

      <FindReplaceBulkSection
        title={t('properties.findReplace', 'Find & Replace')}
        isOpen={resolvedActiveSection === 'findReplace'}
        onToggle={() => toggleSection('findReplace')}
        labelFind={form.labelFind}
        labelReplace={form.labelReplace}
        useRegex={form.useRegex}
        onLabelFindChange={(value) => updateForm('labelFind', value)}
        onLabelReplaceChange={(value) => updateForm('labelReplace', value)}
        onUseRegexChange={(checked) => updateForm('useRegex', checked)}
        onInputKeyDown={handleInputKeyDown}
      />

      <InspectorFooter className="space-y-4">
        <InspectorSummaryCard>
          <div className="text-xs font-semibold text-slate-600">
            {t('properties.previewSummary', 'Preview summary')}
          </div>
          {hasChanges ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
              <li>
                {affectedNodeCount} of {selectedNodes.length} selected nodes will update
              </li>
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

        <Button onClick={handleApply} disabled={!hasChanges} variant="primary" className="w-full">
          {t('properties.applyToSelectedNodes', 'Apply to selected nodes')}
        </Button>
      </InspectorFooter>
    </>
  );
}
