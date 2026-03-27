import React from 'react';
import { Layers, Orbit, Server, WandSparkles, Palette } from 'lucide-react';

export function ArchitectureExploded(): React.ReactElement {
    return (
        <section className="py-32 bg-[#08090A] relative overflow-hidden border-y border-white/5 font-sans">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none translate-y-1/2 translate-x-1/2"></div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12 xl:gap-24">
                
                {/* Left Side: Copy & Legend */}
                <div className="lg:w-7/12 xl:w-1/2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 mb-8 font-mono text-[10px] uppercase tracking-widest font-bold shadow-sm">
                        <Layers className="w-3 h-3" />
                        <span>The Architecture</span>
                    </div>
                    <h2 className="text-4xl lg:text-4xl xl:text-6xl 2xl:text-7xl font-bold tracking-tighter mb-6 text-white leading-[1.1]">
                        Not just a wrapper. <br className="hidden sm:block" />
                        <span className="font-serif italic font-normal text-white/50">A 4-Layer Engine.</span>
                    </h2>
                    <p className="text-base lg:text-sm xl:text-lg text-white/50 leading-relaxed font-medium mb-8 lg:mb-10 max-w-sm lg:max-w-xs xl:max-w-md">
                        By aggressively decoupling state, layout, and rendering, OpenFlowKit delivers native performance without the bloat.
                    </p>

                    <div className="flex flex-col gap-4 lg:gap-4 xl:gap-6">
                        {/* Layer 1 Legend */}
                        <div className="flex items-start gap-3 group">
                            <div className="w-8 h-8 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 text-pink-400 group-hover:scale-110 group-hover:bg-pink-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(236,72,153,0)] group-hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                                <Palette className="w-4 h-4 xl:w-5 xl:h-5" />
                            </div>
                            <div>
                                <h4 className="text-white text-xs lg:text-sm xl:text-base font-bold mb-0.5 group-hover:text-pink-400 transition-colors">1. React Display Layer</h4>
                                <p className="text-xs text-white/40 leading-snug">
                                    A pure, stateless render layer strictly responsible for drawing nodes as fast as possible.
                                </p>
                            </div>
                        </div>

                        {/* Layer 2 Legend */}
                        <div className="flex items-start gap-3 group">
                            <div className="w-8 h-8 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
                                <Orbit className="w-4 h-4 xl:w-5 xl:h-5" />
                            </div>
                            <div>
                                <h4 className="text-white text-xs lg:text-sm xl:text-base font-bold mb-0.5 group-hover:text-cyan-400 transition-colors">2. Collaboration Mesh</h4>
                                <p className="text-xs text-white/40 leading-snug">
                                    A robust, low-latency CRDT network powered by Yjs and WebRTC.
                                </p>
                            </div>
                        </div>

                        {/* Layer 3 Legend */}
                        <div className="flex items-start gap-3 group">
                            <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0 text-green-400 group-hover:scale-110 group-hover:bg-green-500/20 transition-all duration-300">
                                <Server className="w-4 h-4 xl:w-5 xl:h-5" />
                            </div>
                            <div>
                                <h4 className="text-white text-xs lg:text-sm xl:text-base font-bold mb-0.5 group-hover:text-green-400 transition-colors">3. Headless Engine Core</h4>
                                <p className="text-xs text-white/40 leading-snug">
                                    The true source of logic. Headless DSL parsing, type validation, and ELK.js routing.
                                </p>
                            </div>
                        </div>

                        {/* Layer 4 Legend */}
                        <div className="flex items-start gap-4 lg:gap-3 group">
                            <div className="w-8 h-8 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0)] group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                <WandSparkles className="w-4 h-4 xl:w-5 xl:h-5" />
                            </div>
                            <div>
                                <h4 className="text-white text-xs lg:text-sm xl:text-base font-bold mb-0.5 group-hover:text-purple-400 transition-colors">4. LLM Bridge</h4>
                                <p className="text-xs text-white/40 leading-snug">
                                    Private BYOK prompts translated into typed editor commands.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: The 3D Hover Stack */}
                <div className="lg:w-5/12 xl:w-1/2 w-full h-[480px] lg:h-[500px] xl:h-[600px] flex items-center justify-center group perspective-[2000px] xl:pl-16">
                    <style dangerouslySetInnerHTML={{__html: `
                        .engine-stack {
                            transform: rotateX(55deg) rotateY(0deg) rotateZ(-45deg);
                            transition: transform 1s cubic-bezier(0.25, 1, 0.5, 1);
                            transform-style: preserve-3d;
                        }
                        .group:hover .engine-stack {
                            transform: rotateX(50deg) rotateY(0deg) rotateZ(-35deg) scale(1.1);
                        }
                        .layer-1, .layer-2, .layer-3, .layer-4 { 
                            transition: all 1s cubic-bezier(0.25, 1, 0.5, 1);
                            position: absolute; inset: 0; border-radius: 1rem; backdrop-filter: blur(8px);
                        }
                        .layer-1 { transform: translateZ(120px); box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
                        .group:hover .layer-1 { transform: translateZ(240px); box-shadow: 0 50px 100px rgba(236,72,153,0.2); border-color: rgba(236,72,153,1); }
                        
                        .layer-2 { transform: translateZ(40px); box-shadow: 0 0 30px rgba(6,182,212,0.1); }
                        .group:hover .layer-2 { transform: translateZ(80px); box-shadow: 0 40px 80px rgba(6,182,212,0.3); border-color: rgba(6,182,212,1); }
                        
                        .layer-3 { transform: translateZ(-40px); box-shadow: 0 0 30px rgba(34,197,94,0.1); }
                        .group:hover .layer-3 { transform: translateZ(-80px); box-shadow: 0 40px 80px rgba(34,197,94,0.3); border-color: rgba(34,197,94,1); }
                        
                        .layer-4 { transform: translateZ(-120px); box-shadow: 0 0 50px rgba(168,85,247,0.15); }
                        .group:hover .layer-4 { transform: translateZ(-240px); box-shadow: 0 50px 120px rgba(168,85,247,0.5); border-color: rgba(168,85,247,1); }
                    `}} />

                    <div className="relative w-[340px] h-[340px] engine-stack md:scale-100 scale-75">
                        
                        {/* Layer 1: React UI (Top) */}
                        <div className="layer-1 bg-black/40 border-2 border-pink-500/60 flex flex-col p-4 overflow-hidden z-40">
                            <div className="flex items-center justify-between border-b border-pink-500/20 pb-2 mb-4">
                                <div className="text-[10px] font-mono text-pink-400 font-bold uppercase tracking-widest">Client Canvas</div>
                                <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-500/40"></div><div className="w-2 h-2 rounded-full bg-pink-500/40"></div><div className="w-2 h-2 rounded-full bg-pink-500/40"></div></div>
                            </div>
                            <div className="flex gap-4 items-center justify-center flex-1 relative">
                                <div className="w-16 h-8 bg-pink-500/20 border border-pink-500/40 rounded text-[6px] text-pink-200 flex items-center justify-center font-bold">NODE A</div>
                                <div className="w-12 h-px bg-pink-500/50 relative"><div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-pink-500/80 rotate-45 transform translate-x-1"></div></div>
                                <div className="w-16 h-8 bg-pink-500/20 border border-pink-500/40 rounded text-[6px] text-pink-200 flex items-center justify-center font-bold">NODE B</div>
                                {/* Cursor indicator */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#EC4899" xmlns="http://www.w3.org/2000/svg" className="absolute top-1/2 right-1/4 drop-shadow-lg transform -translate-y-1/2 scale-150 animate-pulse"><path d="M4.34315 2.15685L21.3137 19.1274C21.9056 19.7193 21.4862 20.7322 20.6482 20.7322H14.1252L9.88289 24.9745C9.28913 25.5683 8.27435 25.1473 8.27435 24.3075V2.85257C8.27435 2.01633 9.28659 1.59477 9.88045 2.18863L4.34315 2.15685Z" /></svg>
                            </div>
                            <div className="absolute inset-0 bg-pink-500/0 hover:bg-pink-500/5 transition-colors duration-1000"></div>
                        </div>

                        {/* Layer 2: Collaboration Mesh */}
                        <div className="layer-2 bg-black/60 border-2 border-cyan-500/50 flex flex-col p-4 overflow-hidden z-30">
                            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest mb-4">CRDT WebRTC</div>
                            <div className="flex-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(#06b6d440_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
                                <div className="absolute top-1/4 left-1/4 w-3.5 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_20px_#22d3ee] animate-pulse"></div>
                                <div className="absolute bottom-1/3 right-1/3 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] animate-pulse [animation-delay:200ms]"></div>
                                <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee] animate-pulse [animation-delay:400ms]"></div>
                                {/* Connecting lines between nodes */}
                                <svg className="absolute inset-0 w-full h-full" style={{strokeWidth: 1, stroke: 'rgba(34, 211, 238, 0.4)'}}>
                                    <line x1="25%" y1="25%" x2="66%" y2="66%" />
                                    <line x1="66%" y1="66%" x2="75%" y2="50%" />
                                </svg>
                            </div>
                        </div>

                        {/* Layer 3: Headless Core */}
                        <div className="layer-3 bg-[#0d1117]/80 border-2 border-green-500/50 flex flex-col p-6 overflow-hidden z-20">
                            <div className="text-[10px] font-mono text-green-400 font-bold uppercase tracking-widest border-b border-green-500/30 pb-3 mb-3">@openflowkit/core</div>
                            <div className="flex-1 font-mono text-[8.5px] text-green-500/80 space-y-1.5 leading-relaxed">
                                <div><span className="text-purple-400">class</span> Engine {'{'}</div>
                                <div className="pl-3"><span className="text-blue-400">validate</span>(nodes: <span className="text-yellow-600">Node</span>[]): <span className="text-blue-400">boolean</span> {'{'}</div>
                                <div className="pl-6">return nodes.<span className="text-blue-400">every</span>(n =<span className="text-white">&gt;</span> n.id);</div>
                                <div className="pl-3">{'}'}</div>
                                <div className="pl-3"><span className="text-blue-400">export</span>(): <span className="text-yellow-600">JSON</span> {'{'}</div>
                                <div className="pl-6">return <span className="text-yellow-400">JSON</span>.<span className="text-blue-400">stringify</span>(this);</div>
                                <div className="pl-3">{'}'}</div>
                                <div>{'}'}</div>
                            </div>
                        </div>

                        {/* Layer 4: AI Bridge (Bottom) */}
                        <div className="layer-4 bg-black border-2 border-purple-500/60 flex flex-col items-center justify-center p-4 overflow-hidden z-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
                            <div className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-widest absolute top-4 left-6">LLM Proxy</div>
                            <WandSparkles className="w-16 h-16 text-purple-500/60 animate-pulse mt-4" />
                            <div className="mt-6 text-[8px] font-mono text-purple-200 bg-purple-500/20 px-3 py-1.5 rounded-md border border-purple-500/30 shadow-inner">Prompt: &quot;Add auth layer...&quot;</div>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
