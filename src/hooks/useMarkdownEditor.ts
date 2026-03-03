import React from 'react';

interface MarkdownEditor {
    insert: (prefix: string, suffix?: string) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useMarkdownEditor(
    ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement>,
    onChange: (val: string) => void,
    value: string
): MarkdownEditor {
    const insert = (prefix: string, suffix: string = '') => {
        if (!ref.current) return;
        const el = ref.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;

        const selection = value.substring(start, end);
        const before = value.substring(0, start);
        const after = value.substring(end);

        const isWrapped = before.endsWith(prefix) && after.startsWith(suffix);
        const isSelectedWrapped = selection.startsWith(prefix) && selection.endsWith(suffix);

        let newValue: string;
        let newStart: number;
        let newEnd: number;

        if (isWrapped) {
            newValue = before.slice(0, -prefix.length) + selection + after.slice(suffix.length);
            newStart = start - prefix.length;
            newEnd = end - prefix.length;
        } else if (isSelectedWrapped && selection.length > prefix.length + suffix.length) {
            newValue = before + selection.slice(prefix.length, -suffix.length) + after;
            newStart = start;
            newEnd = end - (prefix.length + suffix.length);
        } else {
            newValue = before + prefix + selection + suffix + after;
            newStart = start + prefix.length;
            newEnd = end + prefix.length;
        }

        onChange(newValue);

        requestAnimationFrame(() => {
            if (ref.current) {
                ref.current.focus();
                ref.current.setSelectionRange(newStart, newEnd);
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insert('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insert('_', '_');
                    break;
                case 'e':
                    e.preventDefault();
                    insert('`', '`');
                    break;
                default:
                    break;
            }
        }
    };

    return { insert, handleKeyDown };
}
