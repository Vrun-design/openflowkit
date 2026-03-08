import React, { Suspense, lazy, memo } from 'react';
import { measureDevPerformance } from '@/lib/devPerformance';
import { hasMarkdownSyntax } from './markdownSyntax';

interface MemoizedMarkdownProps {
    content: string;
}

const LazyMarkdownRenderer = lazy(async () => {
    const module = await import('./MarkdownRenderer');
    return { default: module.MarkdownRenderer };
});

function MemoizedMarkdownComponent({ content }: MemoizedMarkdownProps): React.ReactElement {
    return measureDevPerformance('MemoizedMarkdown.render', () => {
        if (!hasMarkdownSyntax(content)) {
            return <span className="whitespace-pre-wrap break-words">{content}</span>;
        }

        return (
            <Suspense fallback={<span className="whitespace-pre-wrap break-words">{content}</span>}>
                <LazyMarkdownRenderer content={content} enableBreaks />
            </Suspense>
        );
    });
}

const MemoizedMarkdown = memo(MemoizedMarkdownComponent);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';

export default MemoizedMarkdown;
