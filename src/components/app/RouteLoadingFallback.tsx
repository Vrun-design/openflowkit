import React from 'react';
import { Loader2 } from 'lucide-react';
import { DEFAULT_ROUTE_LOADING_COPY } from './routeLoadingCopy';

interface RouteLoadingFallbackProps {
  title?: string;
  description?: string;
}

export function RouteLoadingFallback({
  title = DEFAULT_ROUTE_LOADING_COPY.title,
  description = DEFAULT_ROUTE_LOADING_COPY.description,
}: RouteLoadingFallbackProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center bg-[var(--brand-background)] px-6 text-[var(--brand-text)]"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-[var(--brand-text)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--brand-secondary)]">{description}</p>
      </div>
    </div>
  );
}
