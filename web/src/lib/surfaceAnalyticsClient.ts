import posthog from 'posthog-js';

export type AnalyticsSurface = 'app' | 'landing' | 'docs';

type SurfaceAnalyticsOptions = {
  surface: AnalyticsSurface;
  apiKey?: string;
  apiHost?: string;
  enabled?: boolean;
  defaultProperties?: Record<string, string | number | boolean | null | undefined>;
};

type SurfaceEventProperties = Record<string, string | number | boolean | null | undefined>;

const initializedSurfaces = new Set<AnalyticsSurface>();

function sanitizeString(value: string): string {
  return value.trim().slice(0, 200);
}

function sanitizeProperties(
  surface: AnalyticsSurface,
  properties?: SurfaceEventProperties,
  defaultProperties?: SurfaceEventProperties
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries({
      surface,
      ...defaultProperties,
      ...properties,
    })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? sanitizeString(value) : value ?? null])
  );
}

function getEnvironment(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'local';
  if (hostname.includes('preview') || hostname.includes('vercel') || hostname.includes('netlify')) return 'preview';
  return 'production';
}

function getReferrerHost(): string | null {
  if (typeof document === 'undefined' || !document.referrer) {
    return null;
  }

  try {
    return new URL(document.referrer).host;
  } catch {
    return 'invalid';
  }
}

function getPageProperties(): SurfaceEventProperties {
  if (typeof window === 'undefined') {
    return {};
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    path: window.location.pathname,
    hash_path: window.location.hash || null,
    referrer_host: getReferrerHost(),
    environment: getEnvironment(),
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_term: searchParams.get('utm_term'),
    utm_content: searchParams.get('utm_content'),
  };
}

export function initializeSurfaceAnalytics({
  surface,
  apiKey,
  apiHost = 'https://us.i.posthog.com',
  enabled = false,
  defaultProperties,
}: SurfaceAnalyticsOptions): {
  capture: (eventName: string, properties?: SurfaceEventProperties) => void;
  capturePageView: (eventName?: string, properties?: SurfaceEventProperties) => void;
} {
  const isEnabled = enabled && Boolean(apiKey) && typeof window !== 'undefined';

  if (isEnabled && apiKey && !initializedSurfaces.has(surface)) {
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      disable_session_recording: true,
      persistence: 'localStorage',
      persistence_name: `openflowkit_${surface}`,
    });
    initializedSurfaces.add(surface);
  }

  function capture(eventName: string, properties?: SurfaceEventProperties): void {
    if (!isEnabled) {
      return;
    }

    posthog.capture(eventName, sanitizeProperties(surface, properties, defaultProperties));
  }

  function capturePageView(eventName = 'page_viewed', properties?: SurfaceEventProperties): void {
    capture(eventName, {
      ...getPageProperties(),
      ...properties,
    });
  }

  return {
    capture,
    capturePageView,
  };
}
