import React, { useState, useEffect } from 'react';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { CodeDemo } from './landing/CodeDemo';
import { ProblemSection } from './landing/ProblemSection';
import { SolutionSection } from './landing/SolutionSection';
import { FigmaSection } from './landing/FigmaSection';
import { UseCases } from './landing/UseCases';
import { PricingSection } from './landing/PricingSection';
import { Testimonials } from './landing/Testimonials';
import { FinalCTASection } from './landing/FinalCTASection';
import { Footer } from './landing/Footer';
import { RefreshCw } from 'lucide-react';

interface LandingPageProps {
    onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
            <Navbar isScrolled={isScrolled} onLaunch={onLaunch} />
            <main className="relative z-10">
                <HeroSection onLaunch={onLaunch} />

                <SolutionSection />

                <ProblemSection />

                {/* DEMO SECTION - Immersive Billboard Aesthetic */}
                <section className="py-32 md:py-48 relative overflow-hidden bg-white">
                    {/* CAD Texture - Technical "Blueprint" Contrast */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,#80808003_1px,transparent_1px),linear-gradient(-45deg,#80808003_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]"></div>

                    {/* Atmospheric Studio Glows */}
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[80vw] h-[60vw] bg-brand-blue/[0.02] rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/[0.015] rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>

                    <div className="container mx-auto px-6 relative z-10">
                        {/* Central Epic Header */}
                        <div className="flex flex-col items-center text-center mb-24 max-w-5xl mx-auto">
                            {/* Badge with Heartbeat */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary/60 mb-10 font-mono text-[10px] uppercase tracking-[0.2em] font-bold relative overflow-hidden ring-1 ring-brand-primary/5">
                                <div className="absolute inset-0 bg-brand-primary/5 animate-pulse"></div>
                                <RefreshCw className="w-3 h-3 text-brand-blue relative z-10 animate-spin-slow" />
                                <span className="relative z-10">Signature Sync Engine</span>
                            </div>

                            <h2 className="text-6xl md:text-[100px] font-bold text-brand-dark mb-10 tracking-[-0.05em] leading-[1.1] text-balance">
                                Simple for sketching. <br className="hidden md:block" />
                                <span className="font-serif italic font-normal text-brand-primary">Ready for production.</span>
                            </h2>

                            <p className="text-xl md:text-2xl text-brand-secondary leading-relaxed font-medium max-w-3xl text-balance opacity-80">
                                The bridge between <span className="text-brand-dark font-bold border-b-2 border-brand-primary/20">napkin-ideas</span> and documented reality. <br className="hidden md:block" />
                                Hand-drawn precision meet industrial-scale automation.
                            </p>
                        </div>

                        {/* Immersive Stage for Demo */}
                        <div className="relative max-w-6xl mx-auto">
                            {/* Deep Floor Shadow */}
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[90%] h-32 bg-brand-dark/[0.04] blur-[80px] rounded-[100%]"></div>

                            {/* The Elevated Platform */}
                            <div className="relative rounded-3xl p-1.5 bg-gradient-to-b from-white via-white to-gray-50/50 border border-brand-border/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                                <CodeDemo />
                            </div>

                            {/* Floating Capabilities Badge - Right */}
                            <div className="absolute -right-8 top-1/4 hidden lg:block animate-float">
                                <div className="bg-white/90 backdrop-blur-md border border-brand-border/60 p-4 rounded-2xl shadow-xl ring-1 ring-black/5 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                                        <RefreshCw className="w-5 h-5 text-brand-blue" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-brand-dark">Two-way Sync</div>
                                        <div className="text-[10px] text-brand-secondary">UI ↔ Code Reliability</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <FigmaSection />
                <UseCases />
                <PricingSection />
                <Testimonials />
                <FinalCTASection onLaunch={onLaunch} />

                {/* Footer Banner */}
                <div className="bg-brand-primary text-white py-2.5 text-center font-medium text-xs tracking-wide">
                    🚀 We are shipping daily. <span className="underline cursor-pointer opacity-90 hover:opacity-100">Check the Changelog.</span>
                </div>
            </main>
            <Footer onLaunch={onLaunch} />
        </div>
    );
};
