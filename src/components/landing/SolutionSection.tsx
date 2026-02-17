import React from 'react';
import { Sparkles, FileCode, Palette, ShieldCheck, HardDrive, Layers, Lock } from 'lucide-react';

export function SolutionSection(): React.ReactElement {
    return (
        <section id="architecture" className="py-32 bg-brand-canvas relative border-b border-brand-border/60 overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Header */}
            <div className="container mx-auto px-6 mb-24 relative z-10">
                <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary/60 mb-8 font-mono text-[10px] uppercase tracking-widest font-bold opacity-0 animate-slide-up [animation-delay:200ms]">
                        <Layers className="w-3 h-3" />
                        The Features
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold text-brand-dark tracking-tighter leading-[1.1] mb-8 opacity-0 animate-slide-up [animation-delay:300ms]">
                        Everything you need. <br />
                        <span className="font-serif italic font-normal text-brand-primary">Nothing you don't.</span>
                    </h2>
                    <p className="text-xl text-brand-secondary max-w-2xl leading-relaxed font-medium opacity-0 animate-slide-up [animation-delay:400ms] text-balance">
                        The ultimate <span className="text-brand-dark font-bold">white-label</span> canvas. Fully customizable nodes, edges, and themes — powered by <span className="text-brand-dark font-bold">React Flow</span>.
                        It's <span className="text-brand-primary">your brand</span>, given infinite space to breathe.
                    </p>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(340px,auto)]">

                    {/* Card 1: Advanced Diagram as Code (Span 7) */}
                    <div className="md:col-span-7 bg-white rounded-[2.5rem] border border-brand-border p-8 md:p-12 relative overflow-hidden group hover:shadow-2xl hover:shadow-brand-blue/5 transition-all duration-700 flex flex-col justify-between">

                        <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>

                        <div className="relative z-10 max-w-[50%]">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-primary/20">
                                <FileCode className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-bold text-brand-dark mb-4 tracking-tight">Diagram as Code</h3>
                            <p className="text-brand-secondary text-lg leading-relaxed">
                                First-class support for <span className="font-semibold text-brand-primary">Mermaid.js</span> and our type-safe DSL.
                                Define your architecture in code, export as JSON, and let the engine handle the layout.
                            </p>
                        </div>

                        {/* Visual Side (Absolute right) */}
                        <div className="absolute right-[-20px] top-[10%] bottom-[10%] w-[45%] flex flex-col justify-center transition-transform duration-700 group-hover:-translate-x-4">
                            {/* Code Editor */}
                            <div className="bg-[#1e1e1e] rounded-xl shadow-2xl p-4 border border-gray-800 transform rotate-2 group-hover:rotate-0 transition-transform duration-500 origin-center z-20 relative">
                                <div className="flex gap-1.5 mb-3 border-b border-white/10 pb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/80"></div>
                                </div>
                                <div className="font-mono text-[10px] space-y-1.5">
                                    <div className="text-gray-400">// define.ts</div>
                                    <div><span className="text-purple-400">const</span> <span className="text-blue-300">api</span> = <span className="text-yellow-200">Node</span>();</div>
                                    <div><span className="text-purple-400">const</span> <span className="text-blue-300">db</span> = <span className="text-yellow-200">Node</span>();</div>
                                    <div><span className="text-blue-300">api</span>.<span className="text-green-300">connect</span>(<span className="text-blue-300">db</span>);</div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="h-8 flex justify-center items-center my-2 relative z-10">
                                <div className="w-0.5 h-full bg-brand-border group-hover:bg-brand-blue transition-colors"></div>
                                <div className="absolute bottom-0 w-2 h-2 border-r border-b border-brand-border group-hover:border-brand-blue rotate-45 transform translate-y-[-4px] transition-colors"></div>
                            </div>

                            {/* Rendered Block */}
                            <div className="bg-white rounded-xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-brand-border p-3 transform -rotate-1 group-hover:rotate-0 transition-transform duration-500 origin-center z-10 flex flex-col items-center gap-2">
                                <div className="w-24 h-8 bg-brand-canvas border border-brand-border rounded flex items-center justify-center text-[8px] font-bold text-brand-primary">API Service</div>
                                <div className="h-4 w-px bg-brand-border"></div>
                                <div className="w-24 h-8 bg-brand-canvas border border-brand-border rounded flex items-center justify-center text-[8px] font-bold text-brand-primary">Postgres DB</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Flowpilot AI (Span 5) */}
                    <div className="md:col-span-5 bg-[#0A0A0A] rounded-[2.5rem] p-8 md:p-12 flex flex-col relative overflow-hidden group border border-white/10 shadow-2xl min-h-[400px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#222_0%,transparent_60%)]"></div>
                        <div className="absolute inset-0 noise-overlay opacity-10 mix-blend-overlay"></div>

                        {/* Content Top */}
                        <div className="relative z-20 mb-auto">
                            <div className="flex items-center gap-2 mb-3 text-brand-blue font-mono text-[10px] uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" />
                                <span>AI Assistant</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Flowpilot AI</h3>
                            <p className="text-white/60 text-base leading-relaxed">
                                Chat with your diagram. "Make the corners rounder", "Add a load balancer".
                            </p>
                        </div>

                        {/* Visual Bottom - Chat Interface */}
                        <div className="relative w-full mt-8">
                            <div className="space-y-3">
                                {/* User Message */}
                                <div className="flex justify-end transform translate-x-0 transition-transform duration-500 delay-100">
                                    <div className="bg-[#222] border border-white/10 text-white text-xs px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg max-w-[85%]">
                                        Add a Redis cache in front of the DB.
                                    </div>
                                </div>
                                {/* AI Thinking */}
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-brand-blue/20 flex items-center justify-center border border-brand-blue/30">
                                            <Sparkles className="w-3 h-3 text-brand-blue animate-pulse" />
                                        </div>
                                        <div className="h-1 w-1 bg-brand-blue rounded-full animate-bounce [animation-delay:0ms]"></div>
                                        <div className="h-1 w-1 bg-brand-blue rounded-full animate-bounce [animation-delay:150ms]"></div>
                                        <div className="h-1 w-1 bg-brand-blue rounded-full animate-bounce [animation-delay:300ms]"></div>
                                    </div>
                                </div>
                                {/* AI Result */}
                                <div className="flex justify-start w-full">
                                    <div className="bg-[#151515] border border-green-500/20 rounded-xl p-3 shadow-lg w-full max-w-[90%] relative overflow-hidden group-hover:border-green-500/40 transition-colors">
                                        <div className="absolute top-0 left-0 w-0.5 h-full bg-green-500/50"></div>
                                        <div className="font-mono text-[10px] text-gray-400 space-y-1.5 pl-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">diff --git a/diagram.tsx</span>
                                            </div>
                                            <div className="text-green-400">{`+ const redis = new Node({ type: 'Redis' }); `}</div>
                                            <div className="text-green-400">+ api.connect(redis);</div>
                                            <div className="text-green-400">+ redis.connect(db);</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Local First (Span 6) */}
                    <div className="md:col-span-6 bg-white rounded-[2.5rem] border border-brand-border p-8 md:p-12 flex flex-col justify-between group hover:border-brand-primary/20 transition-all relative overflow-hidden min-h-[320px]">
                        <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-700 pointer-events-none">
                            <ShieldCheck className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 mb-6 group-hover:scale-110 transition-transform border border-gray-100">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3">Local & Private</h3>
                            <p className="text-brand-secondary text-lg leading-relaxed">
                                We don't want your data. Everything stays on your machine.
                                No cloud saves, no tracking, no "syncing" to our servers. You have full freedom.
                            </p>
                        </div>

                        <div className="relative z-10 mt-8 flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[11px] font-mono text-gray-600 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Offline Ready
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[11px] font-mono text-gray-600 font-medium">
                                <HardDrive className="w-3 h-3" />
                                Local File System
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Aesthetics (Span 6) */}
                    <div className="md:col-span-6 bg-gradient-to-br from-gray-50 via-white to-purple-50/30 rounded-[2.5rem] border border-brand-border p-8 md:p-12 flex flex-col justify-between group hover:border-purple-200 transition-all relative overflow-hidden min-h-[320px]">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-brand-blue/20 to-purple-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                        <div className="relative z-10 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform border border-purple-100/50">
                                <Palette className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3">Amazing Aesthetics</h3>
                            <p className="text-brand-secondary text-lg leading-relaxed">
                                Break free from "Enterprise Beige". Fully customizable fonts, colors, and shapes.
                                Create diagrams that look like art, not documentation.
                            </p>
                        </div>

                        {/* Visual: Interactive Palette */}
                        <div className="relative z-10 mt-8">
                            <div className="flex items-center gap-3">
                                {/* Swatch 1 */}
                                <div className="group/swatch relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-[#FF5F57] shadow-sm ring-2 ring-white hover:scale-110 transition-transform"></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap">Sunset Red</div>
                                </div>
                                {/* Swatch 2 */}
                                <div className="group/swatch relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-[#FEBC2E] shadow-sm ring-2 ring-white hover:scale-110 transition-transform delay-75"></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap">Amber Warning</div>
                                </div>
                                {/* Swatch 3 */}
                                <div className="group/swatch relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-[#28C840] shadow-sm ring-2 ring-white hover:scale-110 transition-transform delay-100"></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap">Success Green</div>
                                </div>
                                {/* Swatch 4 */}
                                <div className="group/swatch relative cursor-pointer">
                                    <div className="w-10 h-10 rounded-full bg-brand-blue shadow-sm ring-2 ring-white hover:scale-110 transition-transform delay-150"></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap">Klein Blue</div>
                                </div>

                                <div className="w-px h-8 bg-brand-border mx-2"></div>

                                <div className="text-xs font-mono text-brand-secondary bg-white border border-brand-border px-3 py-2 rounded-lg">
                                    font-family: 'Inter', sans-serif;
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}