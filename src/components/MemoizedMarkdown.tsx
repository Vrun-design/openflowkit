import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MemoizedMarkdownProps {
    content: string;
}

const MemoizedMarkdown = memo(({ content }: MemoizedMarkdownProps) => {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {content}
        </ReactMarkdown>
    );
});

export default MemoizedMarkdown;
