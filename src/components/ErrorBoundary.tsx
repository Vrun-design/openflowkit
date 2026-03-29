import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { createLogger } from '@/lib/logger';
import { captureAnalyticsException } from '@/services/analytics/analytics';

const logger = createLogger({ scope: 'ErrorBoundary' });

interface Props extends WithTranslation {
    children?: ReactNode;
    fallback?: ReactNode;
    className?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundaryComponent extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught error.', { error, componentStack: errorInfo.componentStack });
        captureAnalyticsException(error, {
            surface: 'react-error-boundary',
            has_component_stack: Boolean(errorInfo.componentStack),
        });
    }

    public render() {
        const { t } = this.props;
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={`flex items-center justify-center bg-[var(--brand-background)] p-4 ${this.props.className || 'min-h-screen'}`}>
                    <div className="max-w-md w-full overflow-hidden rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-8 text-center shadow-[var(--shadow-lg)]">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-[var(--brand-text)] mb-2">
                            {t('errorBoundary.title')}
                        </h1>

                        <p className="text-[var(--brand-secondary)] mb-8">
                            {t('errorBoundary.description')}
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-4 bg-[var(--brand-background)] rounded-lg text-left text-xs font-mono overflow-auto max-h-32 text-[var(--brand-secondary)]">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors w-full"
                        >
                            <RefreshCcw size={18} />
                            {t('errorBoundary.reloadPage')}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryComponent);
