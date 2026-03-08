import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownRendererProps {
  content: string;
  enableBreaks?: boolean;
}

export function MarkdownRenderer({
  content,
  enableBreaks = false,
}: MarkdownRendererProps): React.ReactElement {
  const remarkPlugins = enableBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm];

  return (
    <ReactMarkdown remarkPlugins={remarkPlugins}>
      {content}
    </ReactMarkdown>
  );
}
