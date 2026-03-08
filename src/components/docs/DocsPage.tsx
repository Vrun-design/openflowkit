import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { AlertCircle, Loader2 } from 'lucide-react';
import { DocsBreadcrumbs } from './DocsBreadcrumbs';
import { DocsFooter } from './DocsFooter';
import { DocsToc } from './DocsToc';
import { MarkdownComponents } from './MarkdownComponents';
import { useDocsPageModel } from './useDocsPageModel';

const LazyDocsChatbot = lazy(async () => {
    const module = await import('./DocsChatbot');
    return { default: module.DocsChatbot };
});

export const DocsPage: React.FC = () => {
    const {
        slug,
        content,
        toc,
        loading,
        error,
        isChatPage,
        handleTocClick,
    } = useDocsPageModel();

    return (
        <div className="animate-in fade-in duration-300 min-h-[60vh] flex gap-12">
            <div className={`flex-1 min-w-0 ${isChatPage ? 'max-w-5xl mx-auto w-full' : ''}`}>
                {!isChatPage && (
                    <>
                        <DocsBreadcrumbs />
                        {(!content || !content.trim().startsWith('# ')) && (
                            <h1 className="text-4xl font-extrabold mb-8 capitalize text-slate-900 tracking-tight leading-tight">
                                {slug?.replace(/-/g, ' ')}
                            </h1>
                        )}
                    </>
                )}

                {loading && (
                    <div className="flex items-center gap-2 text-slate-400 py-12">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading documentation...</span>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 text-red-900 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="font-semibold text-sm">Document Not Found</h3>
                            <p className="text-sm mt-1">We could not find the requested documentation page.</p>
                            <Link to="/docs" className="text-sm mt-3 inline-block font-medium underline">Return to Introduction</Link>
                        </div>
                    </div>
                )}

                {!loading && !error && content && !isChatPage && (
                    <div className="mb-16">
                        <ReactMarkdown
                            components={MarkdownComponents}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSlug, rehypeRaw]}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                )}

                {!loading && !error && isChatPage && (
                    <Suspense
                        fallback={(
                            <div className="flex items-center gap-2 text-slate-400 py-12">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Loading AI assistant...</span>
                            </div>
                        )}
                    >
                        <LazyDocsChatbot />
                    </Suspense>
                )}
                {!loading && !error && !isChatPage && <DocsFooter />}
            </div>

            {!isChatPage && <DocsToc items={toc} onItemClick={handleTocClick} />}
        </div>
    );
};
