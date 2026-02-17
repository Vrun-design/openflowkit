import React, { useState, useEffect } from 'react';
import { Copy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface FinalCTASectionProps {
    onLaunch: () => void;
}

export function FinalCTASection({ onLaunch }: FinalCTASectionProps): React.ReactElement {
    const [copied, setCopied] = useState(false);
    const [terminalStep, setTerminalStep] = useState(0);

    // Simple typing simulation for the terminal
    useEffect(() => {
        const interval = setInterval(() => {
            setTerminalStep((prev) => (prev + 1) % 4);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText('gh repo clone Vrun-design/openflowkit');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="py-32 bg-white relative overflow-hidden border-t border-brand-border">

            {/* Cyber Grid Background - Light */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col items-center text-center">

                    {/* Floating "Bevel" Badge - Light */}
                    <div className="mb-10 animate-float">
                        <div className="bg-white text-brand-dark px-6 py-2 rounded-full border border-gray-100 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,1),0px_10px_20px_-5px_rgba(0,0,0,0.05)] flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-mono text-xs tracking-widest uppercase text-brand-secondary">Ready to use</span>
                        </div>
                    </div>

                    <h2 className="text-6xl md:text-8xl font-bold text-brand-dark mb-8 tracking-tighter leading-[0.9] text-balance">
                        Build diagrams that <br />
                        <span className="font-serif italic font-light text-brand-primary">don’t look generic.</span>
                    </h2>

                    <p className="text-xl text-brand-secondary mb-10 max-w-xl mx-auto leading-relaxed">
                        Join us in building the next generation of visual tools. Open source, local-first, and forever free.
                    </p>

                    {/* Final CTA Button above the block */}
                    <div className="animate-slide-up opacity-0 [animation-delay:300ms] mb-12">
                        <Button size="xl" className="transform hover:-translate-y-1 transition-all active:scale-95" onClick={onLaunch}>
                            Get Started Now <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    {/* The "Command Center" Interaction */}
                    <div className="w-full max-w-2xl relative group">

                        {/* Glow behind terminal */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary via-purple-500 to-pink-500 rounded-xl blur-lg opacity-10 group-hover:opacity-30 transition-opacity duration-1000"></div>

                        {/* Terminal Window - Dark Mode Terminal on Light Background looks professional */}
                        <div className="relative bg-[#1E1E1E] rounded-xl border border-black/5 p-2 shadow-2xl ring-1 ring-black/5">
                            {/* Window Chrome */}
                            <div className="flex items-center px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                                    <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
                                </div>
                                <div className="mx-auto text-[10px] font-mono text-white/30">bash — 80x24</div>
                            </div>

                            {/* Terminal Content */}
                            <div className="p-6 font-mono text-left text-sm md:text-base h-[140px] flex flex-col justify-center">
                                <div className="flex items-center gap-3 text-white/90">
                                    <span className="text-green-400">➜</span>
                                    <span className="text-blue-400">~</span>
                                    <span className="typing-effect">gh repo clone openflowkit</span>
                                </div>

                                {/* Simulated Output Steps */}
                                <div className="mt-4 space-y-1 text-xs md:text-sm text-white/50">
                                    <div className={`transition-opacity duration-300 ${terminalStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                        <span className="text-gray-500">✔</span> Cloning into 'openflowkit'...
                                    </div>
                                    <div className={`transition-opacity duration-300 ${terminalStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                                        <span className="text-gray-500">✔</span> Remote: Enumerating objects...
                                    </div>
                                    <div className={`transition-opacity duration-300 ${terminalStep >= 3 ? 'opacity-100' : 'opacity-0'} text-green-400`}>
                                        <span className="text-green-500">✔</span> Receiving objects: 100% done.
                                    </div>
                                </div>
                            </div>

                            {/* Overlay Action */}
                            <div className="absolute bottom-6 right-6 flex items-center gap-4">
                                <button
                                    onClick={handleCopy}
                                    className="text-xs font-mono text-white/40 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Links - Light Mode */}
                    <div className="mt-12 flex items-center gap-6 text-sm text-brand-secondary">
                        <a href="#/docs" className="hover:text-brand-primary transition-colors">Documentation</a>
                        <span className="opacity-30">•</span>
                        <a href="https://github.com/Vrun-design/FlowMind" target="_blank" rel="noreferrer" className="hover:text-brand-primary transition-colors">GitHub</a>
                        <span className="opacity-30">•</span>
                        <a href="#/docs/roadmap" className="hover:text-brand-primary transition-colors">Roadmap</a>
                    </div>

                </div>
            </div>
        </section>
    );
}
