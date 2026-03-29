import type { TFunction } from 'i18next';
import type { SelectOption } from '@/components/ui/Select';
import { LANGUAGE_LABELS } from '@/hooks/ai-generation/codeToArchitecture';
import type { ImportCategory } from './importDetection';

export interface ImportCategoryDefinition {
  id: ImportCategory;
  fallbackLabel: string;
  labelKey: string;
  hasNative: boolean;
  hasAI: boolean;
}

export const IMPORT_CATEGORY_DEFINITIONS: ImportCategoryDefinition[] = [
  {
    id: 'sql',
    fallbackLabel: 'SQL',
    labelKey: 'commandBar.import.categories.sql',
    hasNative: true,
    hasAI: true,
  },
  {
    id: 'infra',
    fallbackLabel: 'Infra',
    labelKey: 'commandBar.import.categories.infra',
    hasNative: true,
    hasAI: true,
  },
  {
    id: 'openapi',
    fallbackLabel: 'OpenAPI',
    labelKey: 'commandBar.import.categories.openapi',
    hasNative: false,
    hasAI: true,
  },
  {
    id: 'code',
    fallbackLabel: 'Code',
    labelKey: 'commandBar.import.categories.code',
    hasNative: false,
    hasAI: true,
  },
  {
    id: 'codebase',
    fallbackLabel: 'Repo',
    labelKey: 'commandBar.import.categories.codebase',
    hasNative: false,
    hasAI: true,
  },
];

export function createLanguageOptions(): SelectOption[] {
  return Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
}

export function getImportPlaceholders(
  t: TFunction<'translation', undefined>
): Record<ImportCategory, string> {
  return {
    sql: t('commandBar.import.placeholders.sql', 'Paste CREATE TABLE statements here...'),
    infra: t(
      'commandBar.import.placeholders.infra',
      'Paste Terraform state JSON, Kubernetes YAML, Docker Compose, or Terraform HCL here...'
    ),
    openapi: t(
      'commandBar.import.placeholders.openapi',
      'Paste your OpenAPI / Swagger YAML or JSON here...'
    ),
    code: t('commandBar.import.placeholders.code', 'Paste your source code here...'),
    codebase: '',
  };
}

export function getInfraFormatOptions(
  t: TFunction<'translation', undefined>
): SelectOption[] {
  return [
    {
      value: 'terraform-state',
      label: t('commandBar.import.infraFormats.terraformState', 'Terraform State (.tfstate)'),
    },
    {
      value: 'kubernetes',
      label: t('commandBar.import.infraFormats.kubernetes', 'Kubernetes YAML'),
    },
    {
      value: 'docker-compose',
      label: t('commandBar.import.infraFormats.dockerCompose', 'Docker Compose'),
    },
    {
      value: 'terraform-hcl',
      label: t('commandBar.import.infraFormats.terraformHcl', 'Terraform HCL (AI)'),
    },
  ];
}

export function getImportCategoryLabel(
  t: TFunction<'translation', undefined>,
  category: ImportCategory
): string {
  const definition = IMPORT_CATEGORY_DEFINITIONS.find((item) => item.id === category);
  if (!definition) {
    return category;
  }

  return t(definition.labelKey, definition.fallbackLabel);
}

export function getImportCategoryDefinition(
  category: ImportCategory
): ImportCategoryDefinition {
  return (
    IMPORT_CATEGORY_DEFINITIONS.find((item) => item.id === category) ??
    IMPORT_CATEGORY_DEFINITIONS[0]
  );
}

export function getImportAiActionLabel(
  t: TFunction<'translation', undefined>,
  category: ImportCategory
): string {
  switch (category) {
    case 'sql':
      return t('commandBar.import.aiActions.generateErd', 'Generate ERD (AI)');
    case 'infra':
      return t('commandBar.import.aiActions.generateDiagram', 'Generate Diagram (AI)');
    case 'openapi':
      return t('commandBar.import.aiActions.generateSequence', 'Generate Sequence');
    case 'code':
      return t('commandBar.import.aiActions.analyzeArchitecture', 'Analyze Architecture');
    case 'codebase':
      return t('commandBar.import.aiActions.analyzeProject', 'Analyze Project');
    default:
      return category;
  }
}

export function getFileAcceptValue(category: ImportCategory): string | null {
  switch (category) {
    case 'infra':
      return '.tfstate,.json,.yaml,.yml,.tf,.hcl';
    case 'code':
      return '.ts,.tsx,.js,.jsx,.mjs,.py,.go,.java,.rb,.cs,.cpp,.cc,.cxx,.rs';
    case 'sql':
      return '.sql,.txt';
    case 'openapi':
      return '.yaml,.yml,.json';
    default:
      return null;
  }
}

export function getUploadButtonLabel(
  t: TFunction<'translation', undefined>,
  category: ImportCategory
): string {
  return category === 'sql' || category === 'openapi'
    ? t('commandBar.import.uploadFile', 'Upload file')
    : t('common.upload', 'Upload');
}
