import React, { useRef, useState } from 'react';
import { Node } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Box, Palette, Star, Image as ImageStart } from 'lucide-react';
import { ShapeSelector } from './ShapeSelector';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { ImageUpload } from './ImageUpload';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useMarkdownEditor } from '@/hooks/useMarkdownEditor';
import { NodeActionButtons } from './NodeActionButtons';
import { NodeContentSection } from './NodeContentSection';
import { NodeImageSettingsSection } from './NodeImageSettingsSection';
import { NodeTextStyleSection } from './NodeTextStyleSection';
import { NodeWireframeVariantSection } from './NodeWireframeVariantSection';

interface NodePropertiesProps {
    selectedNode: Node<NodeData>;
    onChange: (id: string, data: Partial<NodeData>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
    selectedNode,
    onChange,
    onDuplicate,
    onDelete
}) => {
    const isAnnotation = selectedNode.type === 'annotation';
    const isText = selectedNode.type === 'text';
    const isImage = selectedNode.type === 'image';
    const isWireframeApp = selectedNode.type === 'browser' || selectedNode.type === 'mobile';
    const isWireframeIcon = selectedNode.type === 'wireframe_icon';
    const isWireframeImage = selectedNode.type === 'wireframe_image';
    const isWireframeButton = selectedNode.type === 'wireframe_button';
    const isWireframeInput = selectedNode.type === 'wireframe_input';
    const isWireframeMisc = isWireframeIcon || isWireframeImage || isWireframeButton || isWireframeInput;

    function getDefaultSection(): string {
        if (isWireframeApp) return 'variant';
        if (isWireframeIcon) return 'icon';
        if (isText || isAnnotation) return 'content';
        return 'appearance';
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

    const labelEditor = useMarkdownEditor(labelInputRef, (val) => onChange(selectedNode.id, { label: val }), selectedNode.data?.label || '');
    const descEditor = useMarkdownEditor(descInputRef, (val) => onChange(selectedNode.id, { subLabel: val }), selectedNode.data?.subLabel || '');

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
                onChange(selectedNode.id, { fontWeight: (selectedNode.data?.fontWeight === 'bold' ? 'normal' : 'bold') });
            } else {
                onChange(selectedNode.id, { fontStyle: (selectedNode.data?.fontStyle === 'italic' ? 'normal' : 'italic') });
            }
        }
    };

    return (
        <>
            <hr className="border-slate-100 mb-2" />

            {/* Wireframe Variant Section */}
            {isWireframeApp && (
                <NodeWireframeVariantSection
                    selectedNode={selectedNode}
                    isOpen={activeSection === 'variant'}
                    onToggle={() => toggleSection('variant')}
                    onChange={onChange}
                />
            )}

            {/* Appearance Section */}
            {!isWireframeApp && !isWireframeMisc && !isAnnotation && !isText && !isImage && (
                <CollapsibleSection
                    title="Appearance"
                    icon={<Box className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'appearance'}
                    onToggle={() => toggleSection('appearance')}
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
            {!isWireframeIcon && (
                <NodeContentSection
                    selectedNode={selectedNode}
                    onChange={onChange}
                    isOpen={activeSection === 'content'}
                    onToggle={() => toggleSection('content')}
                    isText={isText}
                    isImage={isImage}
                    isWireframeApp={isWireframeApp}
                    isWireframeMisc={isWireframeMisc}
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
            )}

            {/* Text Styling for Text Node */}
            {isText && (
                <NodeTextStyleSection
                    selectedNode={selectedNode}
                    isOpen={activeSection === 'textStyle'}
                    onToggle={() => toggleSection('textStyle')}
                    onChange={onChange}
                />
            )}

            {!isImage && !isWireframeApp && !isWireframeImage && !isWireframeButton && !isWireframeInput && (
                <CollapsibleSection
                    title="Color Theme"
                    icon={<Palette className="w-3.5 h-3.5" />}
                    isOpen={activeSection === 'color'}
                    onToggle={() => toggleSection('color')}
                >
                    <ColorPicker
                        selectedColor={selectedNode.data?.color}
                        onChange={(color) => onChange(selectedNode.id, { color })}
                    />
                </CollapsibleSection>
            )}

            {!isAnnotation && !isText && !isImage && !isWireframeApp && !isWireframeImage && !isWireframeButton && !isWireframeInput && (
                <CollapsibleSection
                    title="Icon Theme"
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

            {!isText && !isWireframeApp && !isWireframeIcon && !isWireframeButton && !isWireframeInput && !isWireframeImage && (
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
            />
        </>
    );
};
