import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Component
const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
    const { id, message, type } = toast;

    // Icons & Colors
    const styles = {
        success: { icon: CheckCircle, startColor: 'bg-emerald-500', bgColor: 'bg-white', borderColor: 'border-emerald-100', iconColor: 'text-emerald-500' },
        error: { icon: AlertCircle, startColor: 'bg-red-500', bgColor: 'bg-white', borderColor: 'border-red-100', iconColor: 'text-red-500' },
        warning: { icon: AlertCircle, startColor: 'bg-amber-500', bgColor: 'bg-white', borderColor: 'border-amber-100', iconColor: 'text-amber-500' },
        info: { icon: Info, startColor: 'bg-blue-500', bgColor: 'bg-white', borderColor: 'border-blue-100', iconColor: 'text-blue-500' },
    }[type];

    const Icon = styles.icon;

    return (
        <div className={`pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all transform ease-out duration-300 animate-in slide-in-from-top-2 fade-in relative`}>
            {/* Color Strip */}
            <div className={`w-1.5 ${styles.startColor}`}></div>

            <div className="p-4 flex items-start w-full gap-3">
                <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden="true" />
                </div>
                <div className="ml-1 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{message}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                    <button
                        type="button"
                        className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Provider
export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}

            {/* Toast Container */}
            <div
                aria-live="assertive"
                className="pointer-events-none fixed inset-0 flex flex-col items-center px-4 py-6 sm:items-end sm:p-6 z-[9999] gap-2 top-0 left-0 right-0 sm:items-center"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
