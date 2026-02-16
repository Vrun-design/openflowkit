import { useParams } from 'react-router-dom';
import { docsNavigation, DocItem, DocSection } from './docsData';

export const useDocsNavigation = () => {
    const { slug } = useParams();

    // Flatten the list to easily find next/prev
    const flatList: { item: DocItem, section: string }[] = [];
    docsNavigation.forEach(section => {
        section.items.forEach(item => {
            flatList.push({ item, section: section.title });
        });
    });

    const currentIndex = flatList.findIndex(entry => entry.item.slug === slug);
    const currentEntry = currentIndex !== -1 ? flatList[currentIndex] : null;

    const prevEntry = currentIndex > 0 ? flatList[currentIndex - 1] : null;
    const nextEntry = currentIndex < flatList.length - 1 ? flatList[currentIndex + 1] : null;

    return {
        currentEntry,
        prevEntry,
        nextEntry
    };
};
