import { useState, useEffect } from 'react';

// Use Vite's glob import to get raw content of all markdown files in root docs folder
const markdownFiles = import.meta.glob('/docs/*.md', { query: '?raw', import: 'default' });

export const useDocsContent = (slug: string | undefined) => {
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
                // Construct path key relative to project root as Vite expects for glob keys
                const path = `/docs/${slug}.md`;

                const loader = markdownFiles[path];

                if (!loader) {
                    console.warn(`Doc not found: ${path}. Available:`, Object.keys(markdownFiles));
                    throw new Error(`Document not found: ${slug}`);
                }

                const rawContent = await loader() as string;
                setContent(rawContent);
            } catch (err) {
                console.error(err);
                setError('Failed to load documentation');
                setContent(null);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [slug]);

    return { content, loading, error };
};
