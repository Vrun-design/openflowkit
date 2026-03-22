import React, { Suspense, lazy } from 'react';
import { Components } from 'react-markdown';
import { Copy } from 'lucide-react';

const LazySyntaxCodeBlock = lazy(async () => {
    const module = await import('./SyntaxCodeBlock');
    return { default: module.SyntaxCodeBlock };
});

// Code Block Component
interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
    className?: string;
    children?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isMultiLine = String(children).includes('\n');

    if (match || isMultiLine) {
        const language = match ? match[1] : 'text';
        const code = String(children).replace(/\n$/, '');
        return (
            <div className="my-8 rounded-xl overflow-hidden border border-slate-200/60 bg-[#1e293b] shadow-md group">
                <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a]/50 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                        </div>
                        <span className="ml-2 text-xs font-medium text-slate-400 lowercase font-mono">{language}</span>
                    </div>
                    <button
                        onClick={() => navigator.clipboard.writeText(String(children))}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                        title="Copy code"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                </div>
                <Suspense
                    fallback={(
                        <pre className="m-0 overflow-x-auto p-5 text-[13px] leading-relaxed text-slate-100">
                            <code>{code}</code>
                        </pre>
                    )}
                >
                    <LazySyntaxCodeBlock language={language} code={code} />
                </Suspense>
            </div>
        );
    }

    return (
        <code className="bg-slate-100 text-[var(--brand-primary-700)] px-1.5 py-0.5 rounded-[4px] text-[13px] font-medium font-mono border border-slate-200/60" {...props}>
            {children}
        </code>
    );
};

export const MarkdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="text-4xl font-extrabold text-slate-900 mb-8 mt-2 tracking-tight">{children}</h1>
    ),
    h2: ({ children, id }) => (
        <h2 id={id} className="text-2xl font-bold text-slate-900 mt-12 mb-4 tracking-tight group flex items-center gap-2">
            {children}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 text-lg font-normal cursor-pointer">#</span>
        </h2>
    ),
    h3: ({ children, id }) => (
        <h3 id={id} className="text-lg font-bold text-slate-900 mt-8 mb-3 tracking-tight">{children}</h3>
    ),
    p: ({ children }) => (
        <p className="text-[15px] text-slate-600 leading-7 mb-5">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="list-disc pl-5 mb-6 space-y-2 text-slate-600 marker:text-[var(--brand-primary)]">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal pl-5 mb-6 space-y-2 text-slate-600 marker:font-medium">{children}</ol>
    ),
    li: ({ children }) => (
        <li className="leading-7 pl-1">{children}</li>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-[var(--brand-primary)] pl-6 py-2 my-8 text-slate-700 italic bg-gradient-to-r from-slate-50 to-transparent rounded-r-lg">
            {children}
        </blockquote>
    ),
    pre: ({ children }) => <>{children}</>,
    code: CodeBlock,
    a: ({ href, children }) => (
        <a
            href={href}
            className="text-[var(--brand-primary)] hover:text-[var(--brand-primary-700)] font-medium transition-colors border-b border-[var(--brand-primary)]/30 hover:border-[var(--brand-primary)]"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
            {children}
        </a>
    ),
    table: ({ children }) => (
        <div className="overflow-hidden my-8 border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full text-sm text-left border-collapse">{children}</table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200">{children}</thead>
    ),
    tbody: ({ children }) => (
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
    ),
    tr: ({ children }) => (
        <tr className="transition-colors hover:bg-slate-50/50">{children}</tr>
    ),
    th: ({ children }) => (
        <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500">{children}</th>
    ),
    td: ({ children }) => (
        <td className="px-6 py-4 text-slate-600 align-top">{children}</td>
    ),
    hr: () => <hr className="my-10 border-slate-100" />
};
