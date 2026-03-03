export function processContent(content: string, appName: string): string {
    return content
        .replace(/FlowMind/g, appName || 'FlowMind')
        .replace(/OpenFlowKit/g, appName || 'OpenFlowKit')
        .replace(/\[PLACEHOLDER: (.*?)\]/g, (_, text) => {
            return `<div class="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center my-8 text-slate-400 text-sm flex flex-col items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Image: ${text}</span></div>`;
        });
}

export function stripEmojis(value: string): string {
    return value
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/\p{Emoji}/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function slugify(text: string): string {
    return stripEmojis(text)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export interface TocItem {
    level: 2 | 3;
    text: string;
    id: string;
}

export function extractToc(content: string): TocItem[] {
    const regex = /^(#{2,3})\s+(.*)$/gm;
    const result: TocItem[] = [];
    let match: RegExpExecArray | null = regex.exec(content);

    while (match !== null) {
        const level = match[1].length as 2 | 3;
        const originalText = match[2];
        result.push({
            level,
            text: stripEmojis(originalText),
            id: slugify(originalText),
        });
        match = regex.exec(content);
    }

    return result;
}

export function applyDocsMetaTags(slug: string, content: string | null): () => void {
    const titleCase = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    let title = `${titleCase} | OpenFlowKit Docs`;
    let description = 'Learn how to use OpenFlowKit, the open-source Diagram-as-Code engine.';

    if (content) {
        const h1Match = content.match(/^#\s+(.*)$/m);
        if (h1Match && h1Match[1]) {
            title = `${stripEmojis(h1Match[1])} | OpenFlowKit Docs`;
        }

        const paragraphs = content.split('\n\n');
        const firstPara = paragraphs.find((paragraph) => {
            const trimmed = paragraph.trim();
            return Boolean(trimmed) && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('!');
        });
        if (firstPara) {
            description = firstPara.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 160).trim();
            if (description.length === 160) {
                description += '...';
            }
        }
    }

    document.title = title;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    return () => {
        document.title = 'OpenFlowKit | Diagram-as-Code Engine';
        metaDescription?.setAttribute(
            'content',
            'OpenFlowKit is the open-source, white-label Diagram-as-Code engine built for modern workflows.'
        );
    };
}

export function scrollToDocSection(id: string): void {
    const element = document.getElementById(id);
    if (!element) return;

    const offset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
    });
    window.history.pushState({}, '', `#${id}`);
}
