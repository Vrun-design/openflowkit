import React, { useRef, useState } from 'react';
import { Node } from '@/lib/reactflowCompat';
import { NodeData } from '@/lib/types';
import { Box, Palette, Star, Image as ImageStart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker, type ProviderIconSelection } from './IconPicker';
import { ImageUpload } from './ImageUpload';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useMarkdownEditor } from '@/hooks/useMarkdownEditor';
import { NodeActionButtons } from './NodeActionButtons';
import { NodeContentSection } from './NodeContentSection';
import { NodeImageSettingsSection } from './NodeImageSettingsSection';
import { NodeWireframeVariantSection } from './NodeWireframeVariantSection';
import { InspectorSectionDivider } from './InspectorPrimitives';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import { getAssetCategoryDisplayName } from '@/services/assetPresentation';
import {
  createBuiltInIconData,
  createProviderIconData,
  createUploadedIconData,
  normalizeNodeIconData,
} from '@/lib/nodeIconState';
import { getNodeParentId } from '@/lib/nodeParent';
import { buildSectionActions } from './sectionActionBuilder';

interface NodePropertiesProps {
  selectedNode: Node<NodeData>;
  onChange: (id: string, data: Partial<NodeData>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onFitSectionToContents?: (id: string) => void;
  onReleaseFromSection?: (id: string) => void;
  onBringContentsIntoSection?: (id: string) => void;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
  selectedNode,
  onChange,
  onDuplicate,
  onDelete,
  onFitSectionToContents,
  onReleaseFromSection,
  onBringContentsIntoSection,
}) => {
  const { t } = useTranslation();
  const isAnnotation = selectedNode.type === 'annotation';
  const isText = selectedNode.type === 'text';
  const isImage = selectedNode.type === 'image';
  const isSection = selectedNode.type === 'section';
  const isGroup = selectedNode.type === 'group';
  const isWireframeApp = selectedNode.type === 'browser' || selectedNode.type === 'mobile';
  const normalizedIconData = normalizeNodeIconData(selectedNode.data);
  const isIconAssetNode = normalizedIconData?.assetPresentation === 'icon';
  const assetProvider = normalizedIconData?.assetProvider as DomainLibraryCategory | undefined;
  const assetCategory =
    typeof normalizedIconData?.assetCategory === 'string'
      ? normalizedIconData.assetCategory
      : undefined;
  const supportsAdvancedColorTheme = ['process', 'start', 'end', 'decision', 'custom'].includes(
    selectedNode.type || ''
  );
  const supportsColorMode =
    supportsAdvancedColorTheme || isSection || isGroup;
  const supportsCustomColor = supportsAdvancedColorTheme || isText || isSection || isGroup || isAnnotation;
  const parentSectionId = getNodeParentId(selectedNode);
  const sectionActions = buildSectionActions({
    isSection,
    parentSectionId,
    nodeId: selectedNode.id,
    sectionHidden: selectedNode.data?.sectionHidden,
    sectionLocked: selectedNode.data?.sectionLocked,
    onFitSectionToContents,
    onBringContentsIntoSection,
    onReleaseFromSection,
    onChange,
  });

  function getDefaultSection(): string {
    if (isImage) return 'image';
    if (isWireframeApp) return 'variant';
    if (isIconAssetNode) return 'icon';
    if (isSection) return 'content';
    if (isText || isAnnotation) return 'content';
    return 'content';
  }

  // Persist accordion state per node to avoid effect-driven synchronous setState.
  const [activeSectionsByNode, setActiveSectionsByNode] = useState<Record<string, string>>({});
  const activeSection = activeSectionsByNode[selectedNode.id] ?? getDefaultSection();

  function toggleSection(section: string): void {
    const currentSection = activeSectionsByNode[selectedNode.id] ?? getDefaultSection();
    setActiveSectionsByNode((prev) => ({
      ...prev,
      [selectedNode.id]: currentSection === section ? '' : section,
    }));
  }

  const labelInputRef = useRef<HTMLTextAreaElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<'label' | 'subLabel' | null>(null);

  const labelEditor = useMarkdownEditor(
    labelInputRef,
    (val) => onChange(selectedNode.id, { label: val }),
    selectedNode.data?.label || ''
  );
  const descEditor = useMarkdownEditor(
    descInputRef,
    (val) => onChange(selectedNode.id, { subLabel: val }),
    selectedNode.data?.subLabel || ''
  );

  function handleStyleAction(action: 'bold' | 'italic'): void {
    if (activeField === 'label') {
      if (action === 'bold') labelEditor.insert('**', '**');
      else labelEditor.insert('_', '_');
    } else if (activeField === 'subLabel') {
      if (action === 'bold') descEditor.insert('**', '**');
      else descEditor.insert('_', '_');
    } else {
      // Fallback: Toggle Global Style if no text field is active (or maybe just default to label?)
      if (action === 'bold') {
        onChange(selectedNode.id, {
          fontWeight: selectedNode.data?.fontWeight === 'bold' ? 'normal' : 'bold',
        });
      } else {
        onChange(selectedNode.id, {
          fontStyle: selectedNode.data?.fontStyle === 'italic' ? 'normal' : 'italic',
        });
      }
    }
  }

  function handleBuiltInIconChange(icon: string): void {
    onChange(selectedNode.id, createBuiltInIconData(icon));
  }

  function handleProviderIconChange(selection: ProviderIconSelection): void {
    onChange(
      selectedNode.id,
      createProviderIconData({
        packId: selection.packId,
        shapeId: selection.shapeId,
        provider: selection.provider,
        category: selection.category,
      })
    );
  }

  function handleCustomIconChange(url?: string): void {
    onChange(selectedNode.id, createUploadedIconData(url));
  }

  return (
    <>
      <InspectorSectionDivider />

      {/* Wireframe Variant Section */}
      {isWireframeApp && (
        <NodeWireframeVariantSection
          selectedNode={selectedNode}
          isOpen={activeSection === 'variant'}
          onToggle={() => toggleSection('variant')}
          onChange={onChange}
        />
      )}

      {/* Shape Section */}
      {!isWireframeApp &&
        !isAnnotation &&
        !isText &&
        !isImage &&
        !isSection &&
        !isIconAssetNode && (
          <CollapsibleSection
            title={t('properties.shape', 'Shape')}
            icon={<Box className="w-3.5 h-3.5" />}
            isOpen={activeSection === 'shape'}
            onToggle={() => toggleSection('shape')}
          >
            <ShapeSelector
              selectedShape={selectedNode.data?.shape}
              onChange={(shape) => onChange(selectedNode.id, { shape })}
            />
          </CollapsibleSection>
        )}

      {/* Image Settings Section */}
      {isImage && (
        <NodeImageSettingsSection
          selectedNode={selectedNode}
          isOpen={activeSection === 'image'}
          onToggle={() => toggleSection('image')}
          onChange={onChange}
        />
      )}

      {/* Content Section: Refined Design */}
      <NodeContentSection
        selectedNode={selectedNode}
        onChange={onChange}
        isOpen={activeSection === 'content'}
        onToggle={() => toggleSection('content')}
        isText={isText}
        isImage={isImage}
        isWireframeApp={isWireframeApp}
        isWireframeMisc={false}
        onBold={() => handleStyleAction('bold')}
        onItalic={() => handleStyleAction('italic')}
        labelInputRef={labelInputRef}
        descInputRef={descInputRef}
        onLabelFocus={() => setActiveField('label')}
        onLabelBlur={() => setTimeout(() => setActiveField(null), 200)}
        onDescFocus={() => setActiveField('subLabel')}
        onDescBlur={() => setTimeout(() => setActiveField(null), 200)}
        onLabelKeyDown={labelEditor.handleKeyDown}
        onDescKeyDown={descEditor.handleKeyDown}
      />
      {!isImage && !isWireframeApp && !isIconAssetNode && (
        <CollapsibleSection
          title={t('properties.color', 'Color')}
          icon={<Palette className="w-3.5 h-3.5" />}
          isOpen={activeSection === 'color'}
          onToggle={() => toggleSection('color')}
        >
          <ColorPicker
            selectedColor={selectedNode.data?.color}
            selectedColorMode={selectedNode.data?.colorMode}
            selectedCustomColor={selectedNode.data?.customColor}
            onChange={(color) =>
              onChange(selectedNode.id, {
                color,
                ...(color === 'custom' ? {} : { customColor: undefined }),
              })
            }
            onColorModeChange={
              supportsColorMode
                ? (colorMode) => onChange(selectedNode.id, { colorMode })
                : undefined
            }
            onCustomColorChange={
              supportsCustomColor
                ? (customColor) => onChange(selectedNode.id, { color: 'custom', customColor })
                : undefined
            }
            allowModes={supportsColorMode}
            allowCustom={supportsCustomColor}
          />
        </CollapsibleSection>
      )}

      {!isAnnotation && !isText && !isImage && !isWireframeApp && (
        <CollapsibleSection
          title={t('properties.icon', 'Icon')}
          icon={<Star className="w-3.5 h-3.5" />}
          isOpen={activeSection === 'icon'}
          onToggle={() => toggleSection('icon')}
        >
          <div className="space-y-3">
            <IconPicker
              selectedIcon={normalizedIconData?.icon}
              customIconUrl={normalizedIconData?.customIconUrl}
              selectedProvider={assetProvider}
              selectedProviderCategory={assetCategory}
              selectedProviderPackId={normalizedIconData?.archIconPackId as string | undefined}
              selectedProviderShapeId={normalizedIconData?.archIconShapeId as string | undefined}
              onSelectBuiltInIcon={handleBuiltInIconChange}
              onSelectProviderIcon={handleProviderIconChange}
              onCustomIconChange={handleCustomIconChange}
            />
            {isIconAssetNode && (assetProvider || assetCategory) ? (
              <div className="rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2">
                <div className="text-[11px] font-medium text-[var(--brand-secondary)]">
                  {assetProvider ? getAssetCategoryDisplayName(assetProvider) : 'Icons'}
                  {assetCategory ? ` • ${assetCategory}` : ''}
                </div>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      )}

      {!isText && !isWireframeApp && !isIconAssetNode && (
        <CollapsibleSection
          title="Custom Image"
          icon={<ImageStart className="w-3.5 h-3.5" />}
          isOpen={activeSection === 'upload'}
          onToggle={() => toggleSection('upload')}
        >
          <ImageUpload
            imageUrl={selectedNode.data?.imageUrl}
            onChange={(url) => onChange(selectedNode.id, { imageUrl: url })}
          />
        </CollapsibleSection>
      )}

      <NodeActionButtons
        nodeId={selectedNode.id}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        secondaryActions={sectionActions}
      />
    </>
  );
};
