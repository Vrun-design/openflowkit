import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { createLogger } from '@/lib/logger';

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
    }

    public render() {
        const { t } = this.props;
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={`flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 ${this.props.className || 'min-h-screen'}`}>
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-8 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {t('errorBoundary.title')}
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            {t('errorBoundary.description')}
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-left text-xs font-mono overflow-auto max-h-32 text-slate-600 dark:text-slate-400">
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
