import { useEffect, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useBrandConfig } from '@/store/brandHooks';
import { useDocsContent } from './useDocsContent';
import {
    applyDocsMetaTags,
    extractToc,
    processContent,
    scrollToDocSection,
    type TocItem,
} from './docsPageUtils';

interface UseDocsPageModelResult {
    slug?: string;
    content: string | null;
    toc: TocItem[];
    loading: boolean;
    error: string | null;
    isChatPage: boolean;
    handleTocClick: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
}

export function useDocsPageModel(): UseDocsPageModelResult {
    const { slug, lang } = useParams();
    const location = useLocation();
    const brandConfig = useBrandConfig();
    const { content: rawContent, loading, error } = useDocsContent(slug, lang || 'en');

    const content = useMemo(() => {
        if (!rawContent) return null;
        return processContent(rawContent, brandConfig.appName);
    }, [brandConfig.appName, rawContent]);

    const toc = useMemo(() => {
        if (!content) return [];
        return extractToc(content);
    }, [content]);

    useEffect(() => {
        if (!slug) return;
        return applyDocsMetaTags(slug, content);
    }, [slug, content, location.pathname]);

    function handleTocClick(event: MouseEvent<HTMLAnchorElement>, id: string): void {
        event.preventDefault();
        scrollToDocSection(id);
    }

    return {
        slug,
        content,
        toc,
        loading,
        error,
        isChatPage: slug === 'ask-flowpilot',
        handleTocClick,
    };
}
