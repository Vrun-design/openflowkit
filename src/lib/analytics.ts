import posthog from 'posthog-js';
import { useFlowStore } from '../store';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

export const initAnalytics = () => {
    // Check store preference
    const { analyticsEnabled } = useFlowStore.getState().viewSettings;
    if (!analyticsEnabled) return;

    if (POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            person_profiles: 'identified_only', // Optimized for anonymous users
            capture_pageview: true, // Track page visits automatically
            autocapture: {
                dom_event_allowlist: ['click', 'submit'], // Only track clicks/submits
                url_allowlist: [/.*/], // Allow all URLs
                element_allowlist: ['button', 'a', 'input', 'select', 'textarea'], // Only track these elements
                css_selector_allowlist: ['.ph-capture'], // Or specific classes
            },
            mask_all_element_attributes: true, // Mask all attributes (data-*, id, etc.)
            mask_all_text: true, // Mask all text content
        });
    } else {
        console.warn('Analytics: Missing VITE_POSTHOG_KEY');
    }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    const { analyticsEnabled } = useFlowStore.getState().viewSettings;
    if (!analyticsEnabled) return;

    if (POSTHOG_KEY) {
        posthog.capture(eventName, properties);
    } else {
        console.log(`[Analytics Dev] Tracked: ${eventName}`, properties);
    }
};

export const updateAnalyticsConsent = (enabled: boolean) => {
    if (enabled) {
        posthog.opt_in_capturing();
    } else {
        posthog.opt_out_capturing();
    }
};
