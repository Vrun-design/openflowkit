import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';

interface UseAIViewStateParams {
    searchQuery: string;
    isGenerating: boolean;
    onAIGenerate: (prompt: string, imageBase64?: string) => Promise<void>;
    onClose: () => void;
    chatMessageCount: number;
}

interface UseAIViewStateResult {
    prompt: string;
    setPrompt: (value: string) => void;
    selectedImage: string | null;
    setSelectedImage: (value: string | null) => void;
    fileInputRef: RefObject<HTMLInputElement>;
    scrollRef: RefObject<HTMLDivElement>;
    handleGenerate: (text?: string) => Promise<void>;
    handleKeyDown: (e: KeyboardEvent) => void;
    handleImageSelect: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function useAIViewState({
    searchQuery,
    isGenerating,
    onAIGenerate,
    onClose,
    chatMessageCount,
}: UseAIViewStateParams): UseAIViewStateResult {
    const [prompt, setPrompt] = useState(searchQuery || '');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessageCount]);

    async function handleGenerate(text?: string): Promise<void> {
        const promptText = text || prompt;
        if ((!promptText.trim() && !selectedImage) || isGenerating) return;


        await onAIGenerate(promptText, selectedImage || undefined);
        setPrompt('');
        setSelectedImage(null);
        onClose();
    }

    function handleKeyDown(e: KeyboardEvent): void {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    }

    function handleImageSelect(e: ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    return {
        prompt,
        setPrompt,
        selectedImage,
        setSelectedImage,
        fileInputRef,
        scrollRef,
        handleGenerate,
        handleKeyDown,
        handleImageSelect,
    };
}
