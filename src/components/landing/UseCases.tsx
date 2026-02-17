import React from 'react';
import {
    Terminal,
    Figma,
    GitBranch,
    Share2,
    Workflow
} from 'lucide-react';

export function UseCases(): React.ReactElement {
    return (
        <section id="workflows" className="py-32 bg-[#050505] relative overflow-hidden text-white selection:bg-brand-blue/30 border-t border-white/5">

            {/* Subtle Background Mesh */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-blue/5 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-24 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 mb-8 font-mono text-[10px] uppercase tracking-widest font-bold">
                        <Workflow className="w-3 h-3" />
                        <span>Workflows</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 text-white leading-[0.9]">
                        One engine. <br />
                        <span className="font-serif italic font-normal text-white/50">Three native workflows.</span>
                    </h2>
                    <p className="text-xl text-white/50 max-w-2xl leading-relaxed text-balance font-medium">
                        OpenFlowKit adapts to the tool you are already using. No new tabs to open. No context switching.
                    </p>
                </div>

                {/* Persona Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                    {/* Persona 1: Engineering (Cyan/Blue Theme) */}
                    <div className="group relative bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col hover:border-cyan-500/30 transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(6,182,212,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="p-8 relative z-10 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-cyan-950/30 flex items-center justify-center border border-cyan-500/20 text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                                <Terminal className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Engineering</h3>
                            <p className="text-sm text-cyan-400 font-mono mb-4">DIAGRAM AS CODE</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                                Write diagrams in our DSL or Mermaid.js syntax. Paste code, get a fully laid-out diagram. Export as JSON to version control.
                            </p>

                            {/* Visual: Mini Code Editor */}
                            <div className="bg-[#050505] rounded-xl border border-white/10 p-4 font-mono text-[10px] text-gray-500 leading-relaxed shadow-inner">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                                    <div className="ml-auto text-xs text-white/20">architecture.dsl</div>
                                </div>
                                <div><span className="text-cyan-300">Auth Service</span></div>
                                <div className="pl-4"><span className="text-white/70">-&gt;</span> <span className="text-cyan-300">API Gateway</span></div>
                                <div className="pl-4"><span className="text-white/70">-&gt;</span> <span className="text-cyan-300">Redis Cache</span></div>
                                <div className="pl-4"><span className="text-white/70">-&gt;</span> <span className="text-cyan-300">Postgres DB</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Persona 2: Design (Violet/Purple Theme) */}
                    <div className="group relative bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col hover:border-violet-500/30 transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="p-8 relative z-10 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-violet-950/30 flex items-center justify-center border border-violet-500/20 text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                                <Figma className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Design</h3>
                            <p className="text-sm text-violet-400 font-mono mb-4">THE VISUAL LAYER</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                                Stop rebuilding screens. Copy from the canvas and paste into Figma as editable SVG and text layers.
                            </p>

                            {/* Visual: Figma Canvas */}
                            <div className="h-[140px] bg-[#1e1e1e] rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:12px_12px]"></div>

                                <div className="bg-[#0A0A0A] border border-violet-500/50 rounded p-3 w-32 shadow-2xl relative transform group-hover:-translate-y-1 transition-transform">
                                    <div className="absolute -top-3 left-0 bg-violet-500 text-white text-[8px] px-1.5 py-0.5 rounded">Group 1</div>
                                    <div className="flex gap-2 mb-2">
                                        <div className="w-6 h-6 rounded bg-violet-500/20"></div>
                                        <div className="flex-1 space-y-1">
                                            <div className="h-1.5 w-full bg-white/20 rounded"></div>
                                            <div className="h-1.5 w-1/2 bg-white/20 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Cursor */}
                                <svg className="w-4 h-4 text-white fill-white absolute bottom-4 right-10 drop-shadow-lg" viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Persona 3: Export & Share (Amber/Orange Theme) */}
                    <div className="group relative bg-[#0A0A0A] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col hover:border-amber-500/30 transition-all duration-500 hover:shadow-[0_0_50px_-12px_rgba(245,158,11,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="p-8 relative z-10 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-amber-950/30 flex items-center justify-center border border-amber-500/20 text-amber-400 mb-6 group-hover:scale-110 transition-transform">
                                <Share2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Export & Share</h3>
                            <p className="text-sm text-amber-400 font-mono mb-4">PIXEL-PERFECT OUTPUT</p>
                            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                                Export diagrams as SVG, PNG, or PDF. Copy to clipboard and paste into Figma with editable layers. Save as JSON to share or version control.
                            </p>

                            {/* Visual: Export Formats */}
                            <div className="h-[140px] bg-[#151515] rounded-xl border border-white/10 p-4 relative overflow-hidden flex flex-col justify-center">
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/5 group-hover:border-amber-500/20 transition-colors">
                                        <div className="w-6 h-6 bg-amber-500/10 rounded flex items-center justify-center text-[9px] text-amber-400 font-bold">SVG</div>
                                        <div className="text-[10px] text-white/60 font-mono">Vector • Editable in Figma</div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/5 group-hover:border-amber-500/20 transition-colors">
                                        <div className="w-6 h-6 bg-amber-500/10 rounded flex items-center justify-center text-[9px] text-amber-400 font-bold">PNG</div>
                                        <div className="text-[10px] text-white/60 font-mono">Raster • High-res export</div>
                                    </div>
                                    <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/5 group-hover:border-amber-500/20 transition-colors">
                                        <div className="w-6 h-6 bg-amber-500/10 rounded flex items-center justify-center text-[9px] text-amber-400 font-bold">JSON</div>
                                        <div className="text-[10px] text-white/60 font-mono">Data • Save & restore flows</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}