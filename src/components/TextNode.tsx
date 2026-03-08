import React, { Suspense, lazy, memo } from 'react';
import { Position } from '@/lib/reactflowCompat';
import type { LegacyNodeProps } from '@/lib/reactflowCompat';
import type { NodeData } from '@/lib/types';
import { useInlineNodeTextEdit } from '@/hooks/useInlineNodeTextEdit';
import { InlineTextEditSurface } from './InlineTextEditSurface';
import { NodeChrome } from './NodeChrome';
import { hasMarkdownSyntax } from './markdownSyntax';

const LazyMarkdownRenderer = lazy(async () => {
    const module = await import('./MarkdownRenderer');
    return { default: module.MarkdownRenderer };
});

const TEXT_COLORS: Record<string, { text: string, border: string }> = {
    slate: { text: 'text-slate-700', border: 'border-slate-300' },
    blue: { text: 'text-blue-700', border: 'border-blue-300' },
    emerald: { text: 'text-emerald-700', border: 'border-emerald-300' },
    amber: { text: 'text-amber-700', border: 'border-amber-300' },
    violet: { text: 'text-violet-700', border: 'border-violet-300' },
    red: { text: 'text-red-700', border: 'border-red-300' },
    pink: { text: 'text-pink-700', border: 'border-pink-300' },
    yellow: { text: 'text-yellow-800', border: 'border-yellow-400' },
};

function getSemanticFontSizeClass(fontSize: string): string {
    switch (fontSize) {
        case 'small':
            return 'text-sm';
        case 'medium':
            return 'text-base';
        case 'large':
            return 'text-lg';
        default:
            return 'text-xl';
    }
}

function getBaseFontSizePx(fontSize: string): number {
    const parsed = Number(fontSize);
    if (!Number.isNaN(parsed)) {
        return parsed;
    }

    switch (fontSize) {
        case 'small':
            return 14;
        case 'medium':
            return 16;
        case 'large':
            return 18;
        default:
            return 20;
    }
}

function TextNode(props: LegacyNodeProps<NodeData>): React.ReactElement {
    const { id, data, selected } = props;
    const color = data.color || 'slate';
    const colorSet = TEXT_COLORS[color] || TEXT_COLORS.slate;
    const textColor = colorSet.text;
    const borderColor = colorSet.border;

    const width = (props as { width?: number }).width;
    const height = (props as { height?: number }).height;

    // Font Size Logic
    const fontSize = String(data.fontSize || '16');
    const isNumericSize = !isNaN(Number(fontSize));
    const fontSizeClass = isNumericSize ? '' : getSemanticFontSizeClass(fontSize);
    const baseFontSizePx = getBaseFontSizePx(fontSize);
    const effectiveWidth = typeof width === 'number' ? width : 160;
    const effectiveHeight = typeof height === 'number' ? height : 44;
    const geometricScale = Math.sqrt((effectiveWidth * effectiveHeight) / (160 * 44));
    const clampedScale = Math.max(0.75, Math.min(3, geometricScale));
    const effectiveFontSizePx = Math.round(baseFontSizePx * clampedScale);
    const fontSizeStyle = { fontSize: `${effectiveFontSizePx}px` };

    // Font Family Map
    const fontFamilyMap: Record<string, string> = {
        inter: 'font-inter',
        roboto: 'font-roboto',
        outfit: 'font-outfit',
        playfair: 'font-playfair',
        fira: 'font-fira',
        sans: 'font-sans',
        serif: 'font-serif',
        mono: 'font-mono',
    };
    const fontFamilyClass = fontFamilyMap[data.fontFamily || 'inter'];
    const labelEdit = useInlineNodeTextEdit(id, 'label', data.label || '', {
        multiline: true,
        allowTabCreateSibling: true,
    });
    const labelContent = data.label || 'Text';
    const renderedLabel = hasMarkdownSyntax(labelContent)
        ? (
            <Suspense fallback={<span className="whitespace-pre-wrap break-words">{labelContent}</span>}>
                <LazyMarkdownRenderer content={labelContent} enableBreaks />
            </Suspense>
        )
        : <span className="whitespace-pre-wrap break-words">{labelContent}</span>;

    return (
        <NodeChrome
            selected={Boolean(selected)}
            minWidth={50}
            minHeight={30}
            handleClassName="!w-3 !h-3 !border-2 !border-white"
            handleVisibilityOptions={{ includeConnectingState: false }}
            handles={[
                { id: 'target-top', position: Position.Top, side: 'top' },
                { id: 'source-right', position: Position.Right, side: 'right' },
                { id: 'source-bottom', position: Position.Bottom, side: 'bottom' },
                { id: 'target-left', position: Position.Left, side: 'left' },
            ]}
        >
            <div
                className={`
          w-full h-full box-border flex items-center justify-center p-2 rounded-lg transition-all duration-200 border-2
          ${!data.backgroundColor ? 'hover:bg-slate-100/50 border-transparent' : borderColor}
        `}
                style={{
                    minWidth: 50,
                    minHeight: 30,
                    width: '100%',
                    height: '100%',
                    backgroundColor: data.backgroundColor || 'transparent',
                    ...fontSizeStyle
                }}
            >
                <InlineTextEditSurface
                    isEditing={labelEdit.isEditing}
                    draft={labelEdit.draft}
                    displayValue={renderedLabel}
                    onBeginEdit={labelEdit.beginEdit}
                    onDraftChange={labelEdit.setDraft}
                    onCommit={labelEdit.commit}
                    onKeyDown={labelEdit.handleKeyDown}
                    className={`prose prose-sm max-w-full w-full text-center leading-snug font-medium break-words ${textColor} ${fontSizeClass} ${fontFamilyClass}`}
                    style={{ fontSize: `${effectiveFontSizePx}px` }}
                    inputClassName="text-center"
                    inputStyle={{ fontSize: `${effectiveFontSizePx}px` }}
                    inputMode="multiline"
                    isSelected={Boolean(selected)}
                />
            </div>
        </NodeChrome>
    );
}

export default memo(TextNode);
