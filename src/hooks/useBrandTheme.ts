import { useEffect } from 'react';
import { useFlowStore } from '../store';
import { applyBrandTheme } from '@/lib/brandService';

export const useBrandTheme = () => {
    const brandConfig = useFlowStore((state) => state.brandConfig);

    useEffect(() => {
        applyBrandTheme(brandConfig);
    }, [brandConfig]);

    // Update Favicon
    useEffect(() => {
        const updateFavicon = (url: string | null) => {
            const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = url || '/favicon.svg'; // Fallback to default
            document.getElementsByTagName('head')[0].appendChild(link);
        };

        if (brandConfig.faviconUrl) {
            updateFavicon(brandConfig.faviconUrl);
        } else {
            // Reset to default if needed, or keeping it strictly controlled by config
            updateFavicon(null);
        }
    }, [brandConfig.faviconUrl]);
};
