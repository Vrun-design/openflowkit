import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
import { MarkdownComponents } from './MarkdownComponents';
import { useDocsContent } from './useDocsContent';
import { DocsBreadcrumbs } from './DocsBreadcrumbs';
import { DocsFooter } from './DocsFooter';
import { Loader2, AlertCircle } from 'lucide-react';
import { useFlowStore } from '../../store';

// Helper to inject dynamic content and fix placeholders
const processContent = (content: string, appName: string) => {
    return content
        .replace(/FlowMind/g, appName || 'FlowMind')
        .replace(/OpenFlowKit/g, appName || 'OpenFlowKit')
        .replace(/\[PLACEHOLDER: (.*?)\]/g, (_, text) => {
            return `<div class="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center my-8 text-slate-400 text-sm flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Image: ${text}</span></div>`;
        });
};





// Helper to strip emojis for cleaner display
const stripEmojis = (str: string) => {
    return str
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/\p{Emoji}/gu, '') // Add unicode property escape for better coverage
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
};

// Helper to slugify text (matches github-slugger behavior roughly)
const slugify = (text: string) => {
    return stripEmojis(text) // Strip emojis FIRST to match rehype-slug which ignores them
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim start
        .replace(/-+$/, '');         // Trim end
};

// Helper to extract Table of Contents
const extractToc = (content: string) => {
    const regex = /^(#{2,3})\s+(.*)$/gm;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        const originalText = match[2];
        const cleanText = stripEmojis(originalText);

        matches.push({
            level: match[1].length,
            text: cleanText, // Display text without emojis
            id: slugify(originalText) // ID generation uses original text to match rehype-slug behavior
        });
    }
    return matches;
};

export const DocsPage: React.FC = () => {
    const { slug } = useParams();
    const { content: rawContent, loading, error } = useDocsContent(slug);
    const { brandConfig } = useFlowStore();

    const content = useMemo(() => {
        if (!rawContent) return null;
        return processContent(rawContent, brandConfig.appName);
    }, [rawContent, brandConfig.appName]);

    const toc = useMemo(() => {
        if (!content) return [];
        return extractToc(content);
    }, [content]);

    const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 80; // Header height + padding
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });

            // Optional: Update URL hash without jumping
            window.history.pushState({}, '', `#${id}`);
        }
    };

    return (
        <div className="animate-in fade-in duration-300 min-h-[60vh] flex gap-12">
            <div className="flex-1 min-w-0">
                <DocsBreadcrumbs />

                {/* Only show title if the content doesn't start with an H1 */
                    (!content || !content.trim().startsWith('# ')) && (
                        <h1 className="text-4xl font-extrabold mb-8 capitalize text-slate-900 tracking-tight leading-tight">
                            {slug?.replace(/-/g, ' ')}
                        </h1>
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
                            <p className="text-sm mt-1">We couldn't find the requested documentation page.</p>
                            <Link to="/docs" className="text-sm mt-3 inline-block font-medium underline">Return to Introduction</Link>
                        </div>
                    </div>
                )}

                {!loading && !error && content && (
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

                {!loading && !error && <DocsFooter />}
            </div>

            <div className="hidden xl:block w-64 shrink-0">
                <div className="sticky top-6">
                    <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-4">On This Page</h5>
                    <ul className="space-y-2 text-sm border-l border-slate-100">
                        {toc.map((item, i) => (
                            <li key={i}>
                                <a
                                    href={`#${item.id}`}
                                    onClick={(e) => handleScroll(e, item.id)}
                                    className={`
                                        block pl-4 py-1 border-l -ml-px transition-colors cursor-pointer
                                        ${item.level === 2 ? 'text-slate-600 hover:text-slate-900 hover:border-slate-300' : 'text-slate-400 hover:text-slate-700 pl-8 text-xs'}
                                    `}
                                >
                                    {item.text}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};
