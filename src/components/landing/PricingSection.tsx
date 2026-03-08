import React from 'react';
import { Check, ArrowRight, Heart, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface PricingSectionProps {
    onLaunch: () => void;
}

export function PricingSection({ onLaunch }: PricingSectionProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <section id="pricing" className="py-24 md:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6">

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-7xl font-bold text-brand-dark mb-6 tracking-tighter leading-[0.9]">
                            {t('pricing.title')}<br />
                            <span className="font-serif italic font-normal text-brand-primary">{t('pricing.subtitle')}</span>
                        </h2>
                        <p className="text-xl text-brand-secondary max-w-xl mx-auto font-medium">
                            {t('pricing.description')}
                        </p>
                    </div>

                    {/* The Pricing Card */}
                    <div className="relative group">
                        {/* Glow Effect */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-brand-blue/30 via-purple-500/30 to-pink-500/30 rounded-[2.1rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000"></div>

                        <div className="relative bg-white rounded-[2rem] border border-brand-border/80 shadow-2xl overflow-hidden ring-1 ring-black/5">
                            <div className="grid grid-cols-1 md:grid-cols-2">

                                {/* Left: The "Price" */}
                                <div className="p-8 md:p-14 bg-brand-canvas border-b md:border-b-0 md:border-r border-brand-border flex flex-col justify-between relative overflow-hidden">
                                    {/* Background pattern */}
                                    <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                    <div className="relative z-10">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-[11px] font-bold uppercase tracking-wider mb-6 ring-1 ring-white/20">
                                            <Code2 className="w-3 h-3" />
                                            {t('pricing.mitLicense')}
                                        </div>
                                        <h3 className="text-2xl font-bold text-brand-dark mb-2">{t('pricing.freeForever')}</h3>
                                        <p className="text-brand-secondary text-sm leading-relaxed mb-8">
                                            {t('pricing.fullAccess')} <br />{t('pricing.hostAnywhere')}
                                        </p>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-7xl font-bold text-brand-dark tracking-tighter">$0</span>
                                        </div>
                                        <p className="text-xs font-mono text-brand-muted uppercase tracking-wider mb-8">{t('pricing.unlimitedUsage')}</p>

                                        <Button
                                            className="w-full h-12 text-sm flex items-center justify-center gap-2 group"
                                            onClick={onLaunch}
                                        >
                                            <span>{t('common.getStarted')}</span>
                                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                        <p className="text-center text-[10px] text-brand-muted mt-4">
                                            {t('pricing.noAccount')}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: The List */}
                                <div className="p-8 md:p-14 bg-white flex flex-col justify-center">
                                    <h4 className="text-sm font-bold text-brand-dark uppercase tracking-widest mb-8 text-opacity-80">{t('pricing.everythingIncluded')}</h4>
                                    <ul className="space-y-5">
                                        {[
                                            t('pricing.features.unlimitedDiagrams'),
                                            t('pricing.features.saveLocally'),
                                            t('pricing.features.whiteLabelBranding'),
                                            t('pricing.features.oneClickLayout'),
                                            t('pricing.features.exportFormats'),
                                            t('pricing.features.figmaExport'),
                                            t('pricing.features.mermaidSupport'),
                                            t('pricing.features.aiGeneration')
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 group">
                                                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center border border-green-100 group-hover:scale-110 transition-transform shadow-sm">
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </div>
                                                <span className="text-brand-secondary text-[15px] font-medium group-hover:text-brand-primary transition-colors">
                                                    {item}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Sponsor CTA */}
                    <div className="mt-12 text-center">
                        <a href="https://github.com/Vrun-design/FlowMind" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-muted hover:text-brand-primary transition-colors text-sm font-medium">
                            <Heart className="w-4 h-4 fill-current text-pink-500" />
                            {t('pricing.supportDevelopment')}
                        </a>
                    </div>

                </div>
            </div>
        </section>
    );
}
