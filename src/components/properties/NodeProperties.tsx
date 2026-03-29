import React, { useRef, useState } from 'react';
import { Node } from '@/lib/reactflowCompat';
import { NodeData } from '@/lib/types';
import { Box, Palette, Star, Image as ImageStart, Eye, EyeOff, Lock, LockOpen, Maximize2, FolderInput, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { ImageUpload } from './ImageUpload';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useMarkdownEditor } from '@/hooks/useMarkdownEditor';
import { useAssetCatalog } from '@/hooks/useAssetCatalog';
import { NodeActionButtons } from './NodeActionButtons';
import { NodeContentSection } from './NodeContentSection';
import { NodeImageSettingsSection } from './NodeImageSettingsSection';
import { NodeTextStyleSection } from './NodeTextStyleSection';
import { NodeWireframeVariantSection } from './NodeWireframeVariantSection';
import { InspectorSectionDivider } from './InspectorPrimitives';
import { Tooltip } from '../Tooltip';
import { Select } from '../ui/Select';
import type { DomainLibraryCategory } from '@/services/domainLibrary';
import { getAssetCategoryDisplayName, getAssetCategoryNoun } from '@/services/assetPresentation';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { NamedIcon } from '../IconMap';
import { createPropertyInputKeyDownHandler } from './propertyInputBehavior';
import { IconSearchField, IconTileScrollGrid } from './IconTilePickerPrimitives';
import { getNodeParentId } from '@/lib/nodeParent';

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
  const isWireframeApp = selectedNode.type === 'browser' || selectedNode.type === 'mobile';
  const isIconAssetNode = selectedNode.data?.assetPresentation === 'icon';
  const assetProvider = (selectedNode.data?.assetProvider || '') as DomainLibraryCategory;
  const supportsAdvancedColorTheme = ['process', 'start', 'end', 'decision', 'custom'].includes(
    selectedNode.type || ''
  );
  const parentSectionId = getNodeParentId(selectedNode);
  const sectionActions = isSection
    ? [
        {
          id: 'fit-section',
          label: 'Fit Contents',
          icon: <Maximize2 className="w-4 h-4" />,
          onClick: () => onFitSectionToContents?.(selectedNode.id),
        },
        {
          id: 'bring-into-section',
          label: 'Bring Inside',
          icon: <FolderInput className="w-4 h-4" />,
          onClick: () => onBringContentsIntoSection?.(selectedNode.id),
        },
        {
          id: 'toggle-hidden',
          label: selectedNode.data?.sectionHidden ? 'Show Section' : 'Hide Section',
          icon: selectedNode.data?.sectionHidden
            ? <Eye className="w-4 h-4" />
            : <EyeOff className="w-4 h-4" />,
          onClick: () =>
            onChange(selectedNode.id, { sectionHidden: selectedNode.data?.sectionHidden !== true }),
        },
        {
          id: 'toggle-locked',
          label: selectedNode.data?.sectionLocked ? 'Unlock Section' : 'Lock Section',
          icon: selectedNode.data?.sectionLocked
            ? <LockOpen className="w-4 h-4" />
            : <Lock className="w-4 h-4" />,
          onClick: () =>
            onChange(selectedNode.id, { sectionLocked: selectedNode.data?.sectionLocked !== true }),
        },
      ]
    : parentSectionId
      ? [{
          id: 'release-from-section',
          label: 'Release',
          icon: <ArrowUpRight className="w-4 h-4" />,
          onClick: () => onReleaseFromSection?.(selectedNode.id),
        }]
      : [];

  const {
    items: assetItems,
    filteredItems: filteredAssetItems,
    previewUrls: assetPreviewUrls,
    query: assetQuery,
    setQuery: setAssetQuery,
    category: assetFilterCategory,
    setCategory: setAssetFilterCategory,
  } = useAssetCatalog({
    provider: assetProvider,
  });
  const assetCategories = React.useMemo(
    () =>
      Array.from(
        new Set(
          assetItems
            .map((item) => item.providerShapeCategory)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [assetItems]
  );
  const handlePropertyInputKeyDown = createPropertyInputKeyDownHandler({ blurOnEnter: true });

  function getDefaultSection(): string {
    if (isImage) return 'image';
    if (isWireframeApp) return 'variant';
    if (isIconAssetNode) return 'asset';
    if (isSection) return 'content';
    if (isText || isAnnotation) return 'content';
    return 'content';
  }

  // Persist accordion state per node to avoid effect-driven synchronous setState.
  const [activeSectionsByNode, setActiveSectionsByNode] = useState<Record<string, string>>({});
  const activeSection = activeSectionsByNode[selectedNode.id] ?? getDefaultSection();

  const toggleSection = (section: string) => {
    const currentSection = activeSectionsByNode[selectedNode.id] ?? getDefaultSection();
    let nextSection = '';
    if (section === 'typography') {
      nextSection = currentSection === 'content-typography' ? 'content' : 'content-typography';
    } else {
      nextSection = currentSection === section ? '' : section;
    }
    setActiveSectionsByNode((prev) => ({
      ...prev,
      [selectedNode.id]: nextSection,
    }));
  };

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

  const handleStyleAction = (action: 'bold' | 'italic') => {
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
  };

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

      {isIconAssetNode && (
        <CollapsibleSection
          title="Asset"
          icon={<ImageStart className="w-3.5 h-3.5" />}
          isOpen={activeSection === 'asset' || activeSection === 'shape'}
          onToggle={() => toggleSection('asset')}
        >
          <div className="mt-4 space-y-3">
            <IconSearchField
              value={assetQuery}
              onChange={(event) => setAssetQuery(event.target.value)}
              onKeyDown={handlePropertyInputKeyDown}
              placeholder={`Search ${getAssetCategoryDisplayName(assetProvider || 'icons').toLowerCase()} ${getAssetCategoryNoun(assetProvider || 'icons')}`}
            />
            {assetCategories.length > 1 ? (
              <Select
                value={assetFilterCategory}
                onChange={(value) => setAssetFilterCategory(value)}
                options={[
                  { value: 'all', label: 'All categories' },
                  ...assetCategories.map((category) => ({ value: category, label: category })),
                ]}
                placeholder="All categories"
              />
            ) : null}
            <IconTileScrollGrid>
              {filteredAssetItems.map((item) => (
                <Tooltip key={item.id} text={item.label} className="block w-full aspect-square">
                  <button
                    type="button"
                    aria-label={item.label}
                    className={`flex h-full w-full items-center justify-center rounded-[var(--radius-md)] border p-2 transition-all ${
                      selectedNode.data?.archIconShapeId === item.archIconShapeId
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]'
                        : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={async () => {
                      const preview =
                        item.archIconPackId && item.archIconShapeId
                          ? await loadProviderShapePreview(
                              item.archIconPackId,
                              item.archIconShapeId
                            )
                          : null;
                      onChange(selectedNode.id, {
                        label: item.label,
                        icon: item.icon,
                        customIconUrl: preview?.previewUrl,
                        archIconPackId: item.archIconPackId,
                        archIconShapeId: item.archIconShapeId,
                        assetProvider: item.category,
                        assetCategory: item.providerShapeCategory,
                      });
                    }}
                  >
                    {assetPreviewUrls[item.id] ? (
                      <img
                        src={assetPreviewUrls[item.id]}
                        alt={`${item.label} icon`}
                        className="h-10 w-10 object-contain"
                      />
                    ) : item.category === 'icons' ? (
                      <NamedIcon
                        name={item.icon}
                        fallbackName="Box"
                        className="h-5 w-5 text-slate-400"
                      />
                    ) : (
                      <ImageStart className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </Tooltip>
              ))}
            </IconTileScrollGrid>
          </div>
        </CollapsibleSection>
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

      {/* Text Styling for Text Node */}
      {isText && (
        <NodeTextStyleSection
          selectedNode={selectedNode}
          isOpen={activeSection === 'textStyle'}
          onToggle={() => toggleSection('textStyle')}
          onChange={onChange}
        />
      )}

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
              supportsAdvancedColorTheme
                ? (colorMode) => onChange(selectedNode.id, { colorMode })
                : undefined
            }
            onCustomColorChange={
              supportsAdvancedColorTheme
                ? (customColor) => onChange(selectedNode.id, { color: 'custom', customColor })
                : undefined
            }
            allowModes={supportsAdvancedColorTheme}
            allowCustom={supportsAdvancedColorTheme}
          />
        </CollapsibleSection>
      )}

      {!isAnnotation && !isText && !isImage && !isWireframeApp && !isIconAssetNode && (
        <CollapsibleSection
          title={t('properties.icon', 'Icon')}
          icon={<Star className="w-3.5 h-3.5" />}
          isOpen={activeSection === 'icon'}
          onToggle={() => toggleSection('icon')}
        >
          <IconPicker
            selectedIcon={selectedNode.data?.icon}
            customIconUrl={selectedNode.data?.customIconUrl}
            onChange={(icon) => onChange(selectedNode.id, { icon })}
            onCustomIconChange={(url) => onChange(selectedNode.id, { customIconUrl: url })}
          />
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
