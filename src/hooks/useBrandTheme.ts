import { useEffect } from 'react';
import { useBrandConfig } from '@/store/brandHooks';
import { applyBrandTheme } from '@/lib/brandService';

export const useBrandTheme = () => {
    const brandConfig = useBrandConfig();

    // Apply brand CSS variables
    useEffect(() => {
        applyBrandTheme(brandConfig);
        document.documentElement.classList.remove('dark'); // Cleanup any stuck dark mode
    }, [brandConfig]);

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
