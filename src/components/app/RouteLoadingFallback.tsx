import React from 'react';
import { Loader2 } from 'lucide-react';

interface RouteLoadingFallbackProps {
  title?: string;
  description?: string;
}

export function RouteLoadingFallback({
  title = 'Opening workspace',
  description = 'Loading the next screen and restoring the current workspace context.',
}: RouteLoadingFallbackProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen flex items-center justify-center bg-[var(--brand-background)] px-6 text-[var(--brand-text)]"
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--brand-primary)]" />
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
