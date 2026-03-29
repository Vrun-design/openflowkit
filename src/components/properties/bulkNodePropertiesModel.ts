import type { Node } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import { getCapabilityTargetNodeIds, type BulkLabelTransformOptions } from '@/lib/nodeBulkEditing';

export type BulkIconMode = '' | 'built-in' | 'provider' | 'upload';
export type BulkSectionId =
  | 'shape'
  | 'color'
  | 'icon'
  | 'variant'
  | 'architecture'
  | 'journey'
  | 'class'
  | 'sequence'
  | 'labels'
  | 'findReplace'
  | '';

export interface BulkCapabilityCounts {
  shape: number;
  color: number;
  advancedColor: number;
  icon: number;
  variant: number;
  architecture: number;
  journey: number;
  class: number;
  sequence: number;
}

type AvailableBulkSectionCounts = Record<Exclude<BulkSectionId, ''>, number>;

export interface BulkNodePropertiesFormState {
  shape: NodeData['shape'] | '';
  color: string;
  colorMode: NodeData['colorMode'];
  customColor: string | undefined;
  icon: string;
  customIconUrl: string | undefined;
  iconMode: BulkIconMode;
  assetProvider: DomainLibraryCategory | undefined;
  assetCategory: string | undefined;
  archIconPackId: string | undefined;
  archIconShapeId: string | undefined;
  variant: string;
  archEnvironment: string;
  archResourceType: string;
  archZone: string;
  archTrustDomain: string;
  journeySection: string;
  journeyScore: string;
  classStereotype: string;
  sequenceAlias: string;
  labelPrefix: string;
  labelSuffix: string;
  labelFind: string;
  labelReplace: string;
  useRegex: boolean;
}

export const INITIAL_BULK_NODE_PROPERTIES_FORM_STATE: BulkNodePropertiesFormState = {
  shape: '',
  color: '',
  colorMode: 'subtle',
  customColor: undefined,
  icon: '',
  customIconUrl: undefined,
  iconMode: '',
  assetProvider: undefined,
  assetCategory: undefined,
  archIconPackId: undefined,
  archIconShapeId: undefined,
  variant: '',
  archEnvironment: '',
  archResourceType: '',
  archZone: '',
  archTrustDomain: '',
  journeySection: '',
  journeyScore: '',
  classStereotype: '',
  sequenceAlias: '',
  labelPrefix: '',
  labelSuffix: '',
  labelFind: '',
  labelReplace: '',
  useRegex: false,
};

export function getBulkCapabilityCounts(selectedNodes: Node<NodeData>[]): BulkCapabilityCounts {
  return {
    shape: getCapabilityTargetNodeIds(selectedNodes, 'shape').length,
    color: getCapabilityTargetNodeIds(selectedNodes, 'color').length,
    advancedColor: getCapabilityTargetNodeIds(selectedNodes, 'advancedColor').length,
    icon: getCapabilityTargetNodeIds(selectedNodes, 'icon').length,
    variant: getCapabilityTargetNodeIds(selectedNodes, 'variant').length,
    architecture: getCapabilityTargetNodeIds(selectedNodes, 'architecture').length,
    journey: getCapabilityTargetNodeIds(selectedNodes, 'journey').length,
    class: getCapabilityTargetNodeIds(selectedNodes, 'class').length,
    sequence: getCapabilityTargetNodeIds(selectedNodes, 'sequence').length,
  };
}

export function getAvailableBulkSections(counts: AvailableBulkSectionCounts): BulkSectionId[] {
  return [
    counts.shape > 0 ? 'shape' : null,
    counts.color > 0 ? 'color' : null,
    counts.icon > 0 ? 'icon' : null,
    counts.variant > 0 ? 'variant' : null,
    counts.architecture > 0 ? 'architecture' : null,
    counts.journey > 0 ? 'journey' : null,
    counts.class > 0 ? 'class' : null,
    counts.sequence > 0 ? 'sequence' : null,
    'labels',
    'findReplace',
  ].filter((value): value is BulkSectionId => value !== null);
}

export function resetBulkLabelTransformFields(
  form: BulkNodePropertiesFormState
): BulkNodePropertiesFormState {
  return {
    ...form,
    labelPrefix: '',
    labelSuffix: '',
    labelFind: '',
    labelReplace: '',
  };
}

export function buildBulkUpdates(
  form: BulkNodePropertiesFormState,
  includeAdvancedColorControls: boolean
): Partial<NodeData> {
  const updates: Partial<NodeData> = {};

  if (form.shape) {
    updates.shape = form.shape;
  }

  if (form.color) {
    updates.color = form.color;
  }

  if (form.color && includeAdvancedColorControls && form.colorMode) {
    updates.colorMode = form.colorMode;
  }

  if (form.color === 'custom' && includeAdvancedColorControls && form.customColor) {
    updates.customColor = form.customColor;
  }

  if (form.variant) {
    updates.variant = form.variant;
  }

  if (form.iconMode === 'built-in') {
    updates.icon = form.icon;
    updates.customIconUrl = undefined;
    updates.assetProvider = undefined;
    updates.assetCategory = undefined;
    updates.archIconPackId = undefined;
    updates.archIconShapeId = undefined;
  }

  if (form.iconMode === 'upload') {
    updates.icon = undefined;
    updates.customIconUrl = form.customIconUrl;
    updates.assetProvider = undefined;
    updates.assetCategory = undefined;
    updates.archIconPackId = undefined;
    updates.archIconShapeId = undefined;
  }

  if (form.iconMode === 'provider') {
    updates.icon = undefined;
    updates.customIconUrl = undefined;
    updates.assetProvider = form.assetProvider;
    updates.assetCategory = form.assetCategory;
    updates.archIconPackId = form.archIconPackId;
    updates.archIconShapeId = form.archIconShapeId;
  }

  if (form.archEnvironment) {
    updates.archEnvironment = form.archEnvironment;
  }

  if (form.archResourceType) {
    updates.archResourceType = form.archResourceType;
  }

  if (form.archZone) {
    updates.archZone = form.archZone;
  }

  if (form.archTrustDomain) {
    updates.archTrustDomain = form.archTrustDomain;
  }

  if (form.journeySection) {
    updates.journeySection = form.journeySection;
  }

  if (form.journeyScore) {
    const scoreValue = Number(form.journeyScore);
    if (!Number.isNaN(scoreValue)) {
      updates.journeyScore = scoreValue;
    }
  }

  if (form.classStereotype) {
    updates.classStereotype = form.classStereotype;
  }

  if (form.sequenceAlias) {
    updates.seqParticipantAlias = form.sequenceAlias;
  }

  return updates;
}

export function buildLabelOptions(
  form: BulkNodePropertiesFormState
): BulkLabelTransformOptions {
  return {
    labelPrefix: form.labelPrefix,
    labelSuffix: form.labelSuffix,
    labelFindReplace:
      form.labelFind && form.labelReplace
        ? {
            find: form.labelFind,
            replace: form.labelReplace,
            useRegex: form.useRegex,
          }
        : undefined,
  };
}

export function buildChangeSummary(
  selectedNodes: Node<NodeData>[],
  updates: Partial<NodeData>,
  labelOptions: BulkLabelTransformOptions
): string[] {
  const items: string[] = [];
  const totalCount = selectedNodes.length;
  const supportCount = (capability: Parameters<typeof getCapabilityTargetNodeIds>[1]) =>
    getCapabilityTargetNodeIds(selectedNodes, capability).length;

  if (updates.shape) {
    items.push(`shape: ${updates.shape} (${supportCount('shape')}/${totalCount})`);
  }

  if (updates.color) {
    const advancedCount = supportCount('advancedColor');
    const colorModeSummary =
      updates.color === 'custom' && updates.customColor
        ? `${updates.customColor}${advancedCount > 0 && updates.colorMode ? ` (${updates.colorMode})` : ''}`
        : `${updates.color}${advancedCount > 0 && updates.colorMode ? ` (${updates.colorMode})` : ''}`;
    items.push(`color: ${colorModeSummary} (${supportCount('color')}/${totalCount})`);
  }

  if (updates.variant) {
    items.push(`variant: ${updates.variant} (${supportCount('variant')}/${totalCount})`);
  }

  if (updates.icon) {
    items.push(`icon: ${updates.icon} (${supportCount('icon')}/${totalCount})`);
  }

  if (updates.customIconUrl) {
    items.push(`custom icon: uploaded image (${supportCount('icon')}/${totalCount})`);
  }

  if (updates.assetProvider && updates.archIconPackId && updates.archIconShapeId) {
    items.push(
      `provider icon: ${updates.assetProvider}${updates.assetCategory ? ` • ${updates.assetCategory}` : ''} (${supportCount('icon')}/${totalCount})`
    );
  }

  if (updates.archEnvironment) {
    items.push(
      `environment: ${updates.archEnvironment} (${supportCount('architecture')}/${totalCount})`
    );
  }

  if (updates.archResourceType) {
    items.push(
      `resource type: ${updates.archResourceType} (${supportCount('architecture')}/${totalCount})`
    );
  }

  if (updates.archZone) {
    items.push(`zone: ${updates.archZone} (${supportCount('architecture')}/${totalCount})`);
  }

  if (updates.archTrustDomain) {
    items.push(
      `trust domain: ${updates.archTrustDomain} (${supportCount('architecture')}/${totalCount})`
    );
  }

  if (updates.journeySection) {
    items.push(
      `journey section: ${updates.journeySection} (${supportCount('journey')}/${totalCount})`
    );
  }

  if (typeof updates.journeyScore === 'number') {
    items.push(`journey score: ${updates.journeyScore} (${supportCount('journey')}/${totalCount})`);
  }

  if (updates.classStereotype) {
    items.push(
      `class stereotype: ${updates.classStereotype} (${supportCount('class')}/${totalCount})`
    );
  }

  if (updates.seqParticipantAlias) {
    items.push(
      `participant alias: ${updates.seqParticipantAlias} (${supportCount('sequence')}/${totalCount})`
    );
  }

  if (labelOptions.labelPrefix) {
    items.push(`label prefix: "${labelOptions.labelPrefix}" (${totalCount}/${totalCount})`);
  }

  if (labelOptions.labelSuffix) {
    items.push(`label suffix: "${labelOptions.labelSuffix}" (${totalCount}/${totalCount})`);
  }

  if (labelOptions.labelFindReplace) {
    items.push(
      `find & replace: "${labelOptions.labelFindReplace.find}" → "${labelOptions.labelFindReplace.replace}"${labelOptions.labelFindReplace.useRegex ? ' (regex)' : ''} (${totalCount}/${totalCount})`
    );
  }

  return items;
}
