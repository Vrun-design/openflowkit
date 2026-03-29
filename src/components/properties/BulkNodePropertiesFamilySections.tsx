import React from 'react';
import { Braces, Footprints, Layout, ServerCog, Users } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { Select } from '../ui/Select';
import { INSPECTOR_INPUT_CLASSNAME, InspectorField } from './InspectorPrimitives';
import { ENVIRONMENT_OPTIONS, RESOURCE_TYPE_OPTIONS } from './families/architectureOptions';

interface CommonSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface WireframeVariantOption {
  id: string;
  label: string;
}

interface WireframeVariantBulkSectionProps extends CommonSectionProps {
  options: WireframeVariantOption[];
  value: string;
  onChange: (value: string) => void;
}

interface ArchitectureBulkSectionProps extends CommonSectionProps {
  archEnvironment: string;
  archResourceType: string;
  archZone: string;
  archTrustDomain: string;
  onEnvironmentChange: (value: string) => void;
  onResourceTypeChange: (value: string) => void;
  onZoneChange: (value: string) => void;
  onTrustDomainChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface JourneyBulkSectionProps extends CommonSectionProps {
  journeySection: string;
  journeyScore: string;
  onJourneySectionChange: (value: string) => void;
  onJourneyScoreChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface ClassBulkSectionProps extends CommonSectionProps {
  classStereotype: string;
  onChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface SequenceBulkSectionProps extends CommonSectionProps {
  sequenceAlias: string;
  onChange: (value: string) => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function WireframeVariantBulkSection({
  title,
  isOpen,
  onToggle,
  options,
  value,
  onChange,
}: WireframeVariantBulkSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<Layout className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded border px-2 py-2 text-xs font-medium transition-all ${
              value === option.id
                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary)]'
                : 'bg-[var(--brand-surface)] border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </CollapsibleSection>
  );
}

export function ArchitectureBulkSection({
  title,
  isOpen,
  onToggle,
  archEnvironment,
  archResourceType,
  archZone,
  archTrustDomain,
  onEnvironmentChange,
  onResourceTypeChange,
  onZoneChange,
  onTrustDomainChange,
  onInputKeyDown,
}: ArchitectureBulkSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<ServerCog className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <InspectorField label="Environment">
            <Select
              value={archEnvironment}
              onChange={onEnvironmentChange}
              options={ENVIRONMENT_OPTIONS}
              placeholder="Select environment"
            />
          </InspectorField>
          <InspectorField label="Resource Type">
            <Select
              value={archResourceType}
              onChange={onResourceTypeChange}
              options={RESOURCE_TYPE_OPTIONS}
              placeholder="Select resource type"
            />
          </InspectorField>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <InspectorField label="Zone">
            <input
              value={archZone}
              onChange={(event) => onZoneChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              className={INSPECTOR_INPUT_CLASSNAME}
              placeholder="e.g. us-east-1"
            />
          </InspectorField>
          <InspectorField label="Trust Domain">
            <input
              value={archTrustDomain}
              onChange={(event) => onTrustDomainChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              className={INSPECTOR_INPUT_CLASSNAME}
              placeholder="e.g. internal"
            />
          </InspectorField>
        </div>
      </div>
    </CollapsibleSection>
  );
}

export function JourneyBulkSection({
  title,
  isOpen,
  onToggle,
  journeySection,
  journeyScore,
  onJourneySectionChange,
  onJourneyScoreChange,
  onInputKeyDown,
}: JourneyBulkSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<Footprints className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <InspectorField label="Section">
          <input
            value={journeySection}
            onChange={(event) => onJourneySectionChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            className={INSPECTOR_INPUT_CLASSNAME}
            placeholder="Discovery"
          />
        </InspectorField>
        <InspectorField label="Experience Score">
          <input
            value={journeyScore}
            onChange={(event) => onJourneyScoreChange(event.target.value)}
            onKeyDown={onInputKeyDown}
            className={INSPECTOR_INPUT_CLASSNAME}
            placeholder="1-5"
            inputMode="numeric"
          />
        </InspectorField>
      </div>
    </CollapsibleSection>
  );
}

export function ClassBulkSection({
  title,
  isOpen,
  onToggle,
  classStereotype,
  onChange,
  onInputKeyDown,
}: ClassBulkSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<Braces className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <InspectorField label="Stereotype">
        <input
          value={classStereotype}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          className={INSPECTOR_INPUT_CLASSNAME}
          placeholder="interface, abstract, service..."
        />
      </InspectorField>
    </CollapsibleSection>
  );
}

export function SequenceBulkSection({
  title,
  isOpen,
  onToggle,
  sequenceAlias,
  onChange,
  onInputKeyDown,
}: SequenceBulkSectionProps): React.ReactElement {
  return (
    <CollapsibleSection
      title={title}
      icon={<Users className="w-3.5 h-3.5" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <InspectorField label="Alias">
        <input
          value={sequenceAlias}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          className={INSPECTOR_INPUT_CLASSNAME}
          placeholder="A"
        />
      </InspectorField>
    </CollapsibleSection>
  );
}
