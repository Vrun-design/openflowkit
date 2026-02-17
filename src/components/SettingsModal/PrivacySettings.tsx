import React from 'react';
import { Shield, Lock, Database, UserX, MessageSquare, Fingerprint } from 'lucide-react';
import { useFlowStore } from '../../store';
import { Switch } from '../ui/Switch';
import { updateAnalyticsConsent } from '../../lib/analytics';
import { Button } from '../ui/Button';

export const PrivacySettings = () => {
    const { viewSettings, toggleAnalytics } = useFlowStore();

    const handleAnalyticsToggle = (checked: boolean) => {
        toggleAnalytics(checked);
        updateAnalyticsConsent(checked);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Mission Statement */}
            <div className="space-y-4">
                <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-2xl">
                    <h3 className="flex items-center gap-2 font-bold text-[var(--brand-primary)] mb-3 text-sm uppercase tracking-wider">
                        <Shield className="w-4 h-4" />
                        Our Privacy Manifesto
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                        We believe in <strong>privacy by design</strong> and <strong>user autonomy</strong>.
                        We don't collect your email, we don't have a login system, and we don't store your data on our servers.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Feature icon={<Lock className="w-3.5 h-3.5" />} text="Local-First Storage" />
                        <Feature icon={<UserX className="w-3.5 h-3.5" />} text="No User Accounts" />
                        <Feature icon={<Database className="w-3.5 h-3.5" />} text="Own Your Data" />
                        <Feature icon={<Fingerprint className="w-3.5 h-3.5" />} text="Anonymous Usage Only" />
                    </div>
                </div>
            </div>

            {/* Analytics Control */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        Telemetry & Feedback
                    </h3>
                </div>

                <div className="p-1">
                    <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex-1 pr-6">
                            <h4 className="font-medium text-slate-800 mb-1">Anonymous Stats</h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                We only track visits and limited anonymous feature usage (like exports) to improve the tool. We do not track your names, IP addresses, inputs, or diagram content.
                            </p>
                            <p className="text-xs text-slate-400 italic">
                                "We rely on you to tell us what works, rather than tracking your every move."
                            </p>
                        </div>
                        <Switch checked={viewSettings.analyticsEnabled} onCheckedChange={handleAnalyticsToggle} />
                    </div>
                </div>
            </div>

            {/* Feedback Call to Action */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Help Us Improve</h3>
                </div>
                <div className="grid grid-cols-1">
                    <a
                        href="https://forms.gle/hhS4FErGANEZm6oz8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 rounded-xl transition-all group cursor-pointer text-center"
                    >
                        <div className="w-10 h-10 bg-slate-100 group-hover:bg-white rounded-full flex items-center justify-center mb-3 text-slate-500 group-hover:text-[var(--brand-primary)] transition-colors">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-700 group-hover:text-[var(--brand-primary)] text-sm mb-1">Share Feedback</span>
                        <span className="text-xs text-slate-500">Give feedback, report bugs, and ask for features</span>
                    </a>
                </div>
            </div>
        </div>
    );
};

const Feature = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white/50 p-2 rounded-lg border border-[var(--brand-primary)]/5">
        <div className="text-[var(--brand-primary)]">{icon}</div>
        {text}
    </div>
);
