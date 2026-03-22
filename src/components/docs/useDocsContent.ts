import { useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';
import { docsMarkdownLoaders } from './docsMarkdownLoaders';

const logger = createLogger({ scope: 'useDocsContent' });

export const useDocsContent = (slug: string | undefined, lang: string = 'en') => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) {
            setLoading(false);
            return;
        }

        const fetchContent = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construct path key relative to project root with language folder
                const path = `/docs/${lang}/${slug}.md`;
                const fallbackPath = `/docs/en/${slug}.md`;

                let loader = docsMarkdownLoaders[path];

                // Fallback to English if translation doesn't exist
                if (!loader && lang !== 'en') {
                    logger.info('Translation not found; falling back to English.', { lang, path });
                    loader = docsMarkdownLoaders[fallbackPath];
                }

                if (!loader) {
                    logger.warn('Documentation page not found.', {
                        path,
                        availablePaths: Object.keys(docsMarkdownLoaders),
                    });
                    throw new Error(`Document not found: ${slug} for language ${lang}`);
                }

                const rawContent = await loader() as string;
                setContent(rawContent);
            } catch (err) {
                logger.error('Failed to load documentation content.', { error: err, slug, lang });
                setError('Failed to load documentation');
                setContent(null);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [slug, lang]);

    return { content, loading, error };
};
