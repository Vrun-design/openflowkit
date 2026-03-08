import { useEffect, useState } from 'react';

export const useModifierKeys = () => {
    const [isSelectionModifierPressed, setIsSelectionModifierPressed] = useState(false);

    useEffect(() => {
        function isSelectionModifierKey(key: string): boolean {
            return key === 'Meta' || key === 'Control' || key === 'Shift';
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSelectionModifierKey(e.key)) {
                setIsSelectionModifierPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (isSelectionModifierKey(e.key)) {
                setIsSelectionModifierPressed(e.metaKey || e.ctrlKey || e.shiftKey);
            }
        };

        const handleBlur = () => setIsSelectionModifierPressed(false);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return { isSelectionModifierPressed };
};
