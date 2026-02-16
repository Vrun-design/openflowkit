import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DocsSidebar } from './DocsSidebar';
import { useBrandTheme } from '../../hooks/useBrandTheme';
import { Menu, X } from 'lucide-react';

export const DocsLayout: React.FC = () => {
    useBrandTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Redirect to introduction if at root /docs
    useEffect(() => {
        if (location.pathname === '/docs' || location.pathname === '/docs/') {
            navigate('/docs/introduction', { replace: true });
        }
    }, [location.pathname, navigate]);

    return (
        <div className="min-h-screen bg-[var(--brand-background)] text-[var(--brand-text)] flex">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--brand-surface)] border-b border-slate-200 z-30 flex items-center px-4 justify-between">
                <div className="font-semibold text-slate-900">Documentation</div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Sidebar with Mobile State */}
            <DocsSidebar
                className={mobileMenuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}
                onClose={() => setMobileMenuOpen(false)}
            />

            {/* Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-10 lg:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <main className="flex-1 lg:ml-64 flex flex-col min-w-0 bg-[var(--brand-surface)] min-h-screen pt-14 lg:pt-0">
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="max-w-4xl mx-auto px-6 py-8 lg:px-12 lg:py-12">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};
