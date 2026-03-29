import React from 'react';
import { Regex, Search, Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { Switch } from '../ui/Switch';
import {
  INSPECTOR_INPUT_CLASSNAME,
  InspectorField,
  InspectorSummaryCard,
} from './InspectorPrimitives';

interface SelectionSummaryProps {
  familySummary: Array<{ id: string; label: string; count: number }>;
}

interface CommonSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface LabelTransformBulkSectionProps extends CommonSectionProps {
  labelPrefix: string;
  labelSuffix: string;
  onLabelPrefixChange: (value: string) => void;
  onLabelSuffixChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface FindReplaceBulkSectionProps extends CommonSectionProps {
  labelFind: string;
  labelReplace: string;
  useRegex: boolean;
  onLabelFindChange: (value: string) => void;
  onLabelReplaceChange: (value: string) => void;
  onUseRegexChange: (checked: boolean) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function SelectionSummary({ familySummary }: SelectionSummaryProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <InspectorSummaryCard>
      <div className="text-xs font-semibold text-slate-600">
        {t('properties.selectionSummary', 'Selection summary')}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {familySummary.map((family) => (
          <span
            key={family.id}
            className="rounded-full bg-[var(--brand-background)] px-2.5 py-1 text-[11px] font-medium text-[var(--brand-secondary)]"
          >
            {family.count} {family.label}
          </span>
        ))}
      </div>
    </InspectorSummaryCard>
  );
}

export function LabelTransformBulkSection({
  title,
  isOpen,
  onToggle,
  labelPrefix,
  labelSuffix,
  onLabelPrefixChange,
  onLabelSuffixChange,
  onInputKeyDown,
}: LabelTransformBulkSectionProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <CollapsibleSection
      title={title}
      icon={<Type className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <InspectorField label={t('properties.prefixOptional', 'Prefix (optional)')}>
          <input
            value={labelPrefix}
            onChange={(event) => onLabelPrefixChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('properties.prefixOptional', 'Prefix (optional)')}
            className={INSPECTOR_INPUT_CLASSNAME}
          />
        </InspectorField>
        <InspectorField label={t('properties.suffixOptional', 'Suffix (optional)')}>
          <input
            value={labelSuffix}
            onChange={(event) => onLabelSuffixChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('properties.suffixOptional', 'Suffix (optional)')}
            className={INSPECTOR_INPUT_CLASSNAME}
          />
        </InspectorField>
      </div>
    </CollapsibleSection>
  );
}

export function FindReplaceBulkSection({
  title,
  isOpen,
  onToggle,
  labelFind,
  labelReplace,
  useRegex,
  onLabelFindChange,
  onLabelReplaceChange,
  onUseRegexChange,
  onInputKeyDown,
}: FindReplaceBulkSectionProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <CollapsibleSection
      title={title}
      icon={<Search className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <InspectorField label={t('properties.findLabel', 'Find')}>
          <input
            value={labelFind}
            onChange={(event) => onLabelFindChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('properties.findPlaceholder', 'Text to find')}
            className={INSPECTOR_INPUT_CLASSNAME}
          />
        </InspectorField>
        <InspectorField label={t('properties.replaceLabel', 'Replace with')}>
          <input
            value={labelReplace}
            onChange={(event) => onLabelReplaceChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('properties.replacePlaceholder', 'Replacement text')}
            className={INSPECTOR_INPUT_CLASSNAME}
          />
        </InspectorField>
        <div className="flex items-center gap-2">
          <Switch checked={useRegex} onCheckedChange={onUseRegexChange} />
          <span className="text-xs flex items-center gap-1 cursor-pointer">
            <Regex className="w-3 h-3" />
            {t('properties.useRegex', 'Use Regular Expression')}
          </span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
