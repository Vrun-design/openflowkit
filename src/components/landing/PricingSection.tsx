import React from 'react';
import { Check, ArrowRight, Heart, Code2 } from 'lucide-react';
import { Button } from './Button';

interface PricingSectionProps {
    onLaunch: () => void;
}

export function PricingSection({ onLaunch }: PricingSectionProps): React.ReactElement {
    return (
        <section id="pricing" className="py-24 md:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6">

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h2 className="text-5xl md:text-7xl font-bold text-brand-dark mb-6 tracking-tighter leading-[0.9]">
                            Premium features.<br />
                            <span className="font-serif italic font-normal text-brand-primary">Zero dollar price tag.</span>
                        </h2>
                        <p className="text-xl text-brand-secondary max-w-xl mx-auto font-medium">
                            OpenFlowKit is 100% open source. There is no "Enterprise Edition" hidden behind a sales call.
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
                                            MIT License
                                        </div>
                                        <h3 className="text-2xl font-bold text-brand-dark mb-2">Free Forever.</h3>
                                        <p className="text-brand-secondary text-sm leading-relaxed mb-8">
                                            Full access to the core engine. <br />Host it anywhere. Modify it freely.
                                        </p>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-7xl font-bold text-brand-dark tracking-tighter">$0</span>
                                        </div>
                                        <p className="text-xs font-mono text-brand-muted uppercase tracking-wider mb-8">Unlimited Usage</p>

                                        <Button
                                            className="w-full h-12 text-sm flex items-center justify-center gap-2 group"
                                            onClick={onLaunch}
                                        >
                                            <span>Get Started</span>
                                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                        <p className="text-center text-[10px] text-brand-muted mt-4">
                                            No account or credit card required
                                        </p>
                                    </div>
                                </div>

                                {/* Right: The List */}
                                <div className="p-8 md:p-14 bg-white flex flex-col justify-center">
                                    <h4 className="text-sm font-bold text-brand-dark uppercase tracking-widest mb-8 text-opacity-80">Everything Included</h4>
                                    <ul className="space-y-5">
                                        {[
                                            'Unlimited diagrams & projects',
                                            'Save locally, your data stays on your device',
                                            'White-Label Branding',
                                            'One-click auto-layout',
                                            'Export to SVG, PNG, JPG',
                                            'Figma Export',
                                            'Mermaid.js Support',
                                            'AI diagram generation (bring your own API key)'
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
                            Support development on GitHub
                        </a>
                    </div>

                </div>
            </div>
        </section>
    );
}