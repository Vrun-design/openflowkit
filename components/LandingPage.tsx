import React, { useState, useEffect } from 'react';
import { ArrowRight, Zap, Command, Share2, Layout, MousePointer2, Cpu, GitBranch } from 'lucide-react';
import { useFlowStore } from '../store';
import { Button } from './ui/Button';

interface LandingPageProps {
    onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
    const { brandConfig } = useFlowStore();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#030303] text-white selection:bg-indigo-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_20%,black_40%,transparent_100%)]" />
            </div>

            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#030303]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
                <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                            <Zap className="w-4 h-4 text-white fill-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">{brandConfig.appName}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={onLaunch} className="group relative px-5 py-2 rounded-full bg-white text-black font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <span className="relative flex items-center gap-2">
                                Launch Editor <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-20 px-6 max-w-[1400px] mx-auto">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center mb-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        v2.0: Mermaid, AI & Figma Export
                    </div>

                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Diagramming for<br />
                        <span className="text-indigo-400">Pro Engineers.</span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
                        Type code, get flows. The only diagramming tool that combines the speed of Mermaid.js with a Figma-quality design engine.
                    </p>

                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <button onClick={onLaunch} className="h-12 px-8 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] flex items-center gap-2">
                            Start Creating <ArrowRight className="w-4 h-4" />
                        </button>
                        <a href="https://github.com/Vrun-design/OpenFlowKit" target="_blank" rel="noreferrer" className="h-12 px-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all backdrop-blur-sm flex items-center">
                            Star on GitHub
                        </a>
                    </div>

                    {/* App Preview Mockup */}
                    <div className="mt-20 relative w-full max-w-6xl aspect-[16/10] perspective-[2000px] group animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500">
                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-purple-500/20 rounded-xl blur-3xl -z-10 opacity-50 group-hover:opacity-75 transition-opacity duration-1000" />
                        <div className="w-full h-full bg-[#0a0a0a] rounded-xl border border-white/10 shadow-2xl overflow-hidden transform rotate-x-12 transition-transform duration-700 hover:rotate-x-0 origin-center bg-opacity-70 backdrop-blur-xl">
                            {/* Mockup Top Bar */}
                            <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-white/5">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                                </div>
                                <div className="ml-4 px-3 py-1 rounded bg-black/20 text-xs text-slate-500 font-mono">auth_flow.mmd</div>
                            </div>
                            {/* Mockup Content */}
                            <div className="relative w-full h-full p-8 flex items-center justify-center">
                                {/* Simulated Nodes */}
                                <div className="absolute top-1/4 left-1/4 w-32 h-16 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono text-xs shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                    Start Process
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-20 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 font-mono text-xs backdrop-blur-md">
                                    AI Analysis
                                </div>
                                <div className="absolute bottom-1/4 right-1/4 w-32 h-16 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-mono text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    Deploy
                                </div>
                                {/* Connecting Lines (CSS) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                                    <path d="M400,200 C500,200 500,300 600,300" stroke="white" strokeWidth="2" fill="none" />
                                    <path d="M800,300 C900,300 900,400 1000,400" stroke="white" strokeWidth="2" fill="none" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bento Grid Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px] mb-32">
                    {/* Card 1: Mermaid */}
                    <div className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 rounded-3xl bg-neutral-900/50 border border-white/5 p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                                    <GitBranch className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Mermaid Native</h3>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                                    Don't drag nodes. Write code. {brandConfig.appName} parses standard Mermaid.js syntax instantly into complex, editable diagrams. Start with code, finish with design.
                                </p>
                            </div>
                            <div className="font-mono text-sm text-slate-500 bg-black/40 rounded-lg p-4 border border-white/5">
                                <span className="text-purple-400">graph</span> <span className="text-white">TD</span><br />
                                &nbsp;&nbsp;A[Client] --&gt; B(Load Balancer)<br />
                                &nbsp;&nbsp;B --&gt; C{'{'}Server{'}'}<br />
                                <span className="animate-pulse text-indigo-400">|</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: AI */}
                    <div className="rounded-3xl bg-neutral-900/50 border border-white/5 p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-[60px]" />
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                            <Cpu className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">AI Architect</h3>
                        <p className="text-slate-400">
                            "Explain this flow." "Add caching layer." <br />
                            Your AI copilot understands your architecture and edits the graph for you.
                        </p>
                    </div>

                    {/* Card 3: Figma */}
                    <div className="rounded-3xl bg-neutral-900/50 border border-white/5 p-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[60px]" />
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                            <MousePointer2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Figma Ready</h3>
                        <p className="text-slate-400">
                            Copy as SVG. Paste into Figma. <br />
                            Every text block remains editable. Every curve is a vector. No bitmaps.
                        </p>
                    </div>
                </div>

                {/* Footer / CTA */}
                <div className="text-center py-20 border-t border-white/5">
                    <h2 className="text-4xl font-bold tracking-tight mb-8">Ready to ship better systems?</h2>
                    <Button onClick={onLaunch} size="lg" className="h-14 px-10 rounded-full text-lg bg-white text-black hover:bg-slate-200 border-none">
                        Open Editor Now
                    </Button>
                </div>

            </main>
        </div>
    );
};


