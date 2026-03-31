import React from 'react';
import { Video, Play, Film, FastForward, Download, Wand2, Layers, Cpu } from 'lucide-react';

const TIMELINE_MARKERS = ['0:00', '0:01', '0:02', '0:03', '0:04', '0:05', '0:06', '0:07', '0:08'];

const FEATURE_CARDS = [
    {
        title: 'Zero Keyframes Required',
        sub: 'Just design your system. Our engine automatically interpolates movement, opacity, and pathing.',
        icon: FastForward,
    },
    {
        title: 'Cinematic Path Routing',
        sub: 'Data flows perfectly along complex architectural branches using smooth Bezier curves.',
        icon: Wand2,
    },
    {
        title: 'Pristine 60fps Native Exports',
        sub: 'Render natively to MP4 without leaving the browser environment.',
        icon: Film,
    },
] as const;

export function AnimationExportSection(): React.ReactElement {
    return (
        <section className="py-20 md:py-32 bg-[#050505] relative overflow-hidden select-none border-y border-white/5">
            {/* The Stage Light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(233,84,32,0.15),transparent_70%)] pointer-events-none"></div>
            
            {/* The Grid Floor */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_20%,transparent_100%)] pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
                
                {/* Hero Header for the Star Feature */}
                <div className="text-center max-w-5xl mx-auto mb-12 md:mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary mb-10 font-mono text-xs uppercase tracking-[0.2em] font-bold shadow-[0_0_30px_rgba(233,84,32,0.2)]">
                        <Video className="w-4 h-4" />
                        <span>The Star Feature</span>
                    </div>
                    
                    <h2 className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8">
                        Direct your <br />
                        <span className="font-serif italic font-medium text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-orange-400 to-yellow-500">architecture.</span>
                    </h2>
                    
                    <p className="text-xl md:text-2xl text-white/50 leading-relaxed max-w-3xl mx-auto font-medium tracking-tight">
                        The world&apos;s first cinematic export engine for system design. Turn static diagrams into breathtaking, presentation-ready animations in one click.
                    </p>
                </div>

                {/* The Director's Suite Canvas */}
                <div className="w-full max-w-6xl relative perspective-1000">
                    
                    {/* Floating Badges */}
                    <div className="absolute -top-6 -left-6 lg:-left-12 z-20 flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-[float_4s_ease-in-out_infinite]">
                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                        <span className="text-xs font-bold text-white tracking-wider">60fps RENDER</span>
                    </div>
                    
                    <div className="absolute top-32 -right-6 lg:-right-16 z-20 flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-[float_6s_ease-in-out_infinite_reverse]">
                        <Film className="w-4 h-4 text-brand-primary" />
                        <span className="text-xs font-bold text-white tracking-wider">MP4 EXPORT</span>
                    </div>

                    {/* The Main UI Container */}
                    <div className="relative rounded-[32px] bg-[#0A0A0A] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/5 transform transition-transform duration-700 hover:rotate-x-[2deg] hover:scale-[1.02]">
                        
                        {/* Glowing Top Edge */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent shadow-[0_0_30px_rgba(233,84,32,0.8)]"></div>

                        {/* App Header */}
                        <div className="h-14 bg-[#111] border-b border-white/5 flex items-center justify-between px-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"></div>
                            </div>
                            <div className="text-xs font-mono text-white/30 tracking-widest hidden sm:block">OpenFlowKit Cinematic Engine</div>
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">1080p</div>
                                <button className="bg-brand-primary text-white text-[10px] sm:text-xs uppercase font-bold tracking-wider px-4 py-1.5 rounded-full hover:bg-orange-600 transition-colors shadow-[0_0_20px_rgba(233,84,32,0.4)] flex items-center gap-2">
                                    <Download className="w-3 h-3" /> Export
                                </button>
                            </div>
                        </div>

                        {/* Main Stage Area */}
                        <div className="relative aspect-[21/9] bg-[#050505] overflow-hidden flex items-center justify-center isolate group cursor-pointer border-b border-white/5">
                            
                            {/* Animated Cinematic Scene */}
                            <div className="w-full max-w-4xl relative h-[300px] flex items-center justify-between px-12 md:px-24">
                                
                                {/* Client Node */}
                                <div className="relative z-20 w-32 h-32 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.02)]">
                                    <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                                        <Cpu className="w-5 h-5 text-brand-primary" />
                                    </div>
                                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Client</span>
                                    {/* Pulse Ring */}
                                    <div className="absolute inset-0 rounded-2xl border border-brand-primary/30 animate-[ping_3s_ease-out_infinite] opacity-20"></div>
                                </div>

                                {/* Database Node */}
                                <div className="relative z-20 w-32 h-32 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.02)]">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Layers className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <span className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Database</span>
                                    {/* Pulse Ring */}
                                    <div className="absolute inset-0 rounded-2xl border border-blue-500/30 animate-[ping_3s_ease-out_infinite_1.5s] opacity-20"></div>
                                </div>

                                {/* Animated Data Flow (SVG) */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                                    
                                    {/* The Path */}
                                    <path 
                                        id="flow-path"
                                        d="M 230 150 C 400 150, 450 50, 650 150" 
                                        fill="none" 
                                        stroke="rgba(255,255,255,0.1)" 
                                        strokeWidth="2" 
                                        strokeDasharray="6 6"
                                    />
                                    
                                    {/* The glowing data packet moving along path */}
                                    <circle r="4" fill="#e95420" filter="drop-shadow(0 0 10px #e95420)">
                                        <animateMotion 
                                            dur="3s" 
                                            repeatCount="indefinite"
                                            path="M 230 150 C 400 150, 450 50, 650 150"
                                            keyPoints="0;1"
                                            keyTimes="0;1"
                                            calcMode="spline"
                                            keySplines="0.4 0 0.2 1"
                                        />
                                    </circle>

                                    {/* A secondary glowing packet */}
                                    <circle r="3" fill="#60a5fa" filter="drop-shadow(0 0 10px #60a5fa)">
                                        <animateMotion 
                                            dur="3s" 
                                            begin="1.5s"
                                            repeatCount="indefinite"
                                            path="M 650 150 C 450 250, 400 150, 230 150"
                                            keyPoints="0;1"
                                            keyTimes="0;1"
                                            calcMode="spline"
                                            keySplines="0.4 0 0.2 1"
                                        />
                                    </circle>
                                </svg>
                            </div>

                            {/* Massive Play Button Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px]">
                                <div className="w-24 h-24 bg-brand-primary/90 text-white rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(233,84,32,0.6)] transform group-hover:scale-110 transition-transform duration-500">
                                    <Play className="w-10 h-10 fill-white ml-2" />
                                </div>
                            </div>
                        </div>

                        {/* Professional Timeline UI */}
                        <div className="h-48 bg-[#111] p-6 flex flex-col justify-between relative overflow-hidden">
                            {/* Playhead line (spans full height of timeline) */}
                            <div className="absolute top-0 bottom-0 left-[35%] w-px bg-brand-primary z-30 shadow-[0_0_10px_rgba(233,84,32,1)]">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-brand-primary rounded-b-sm"></div>
                            </div>

                            {/* Time markers */}
                            <div className="flex justify-between text-[10px] font-mono text-white/30 border-b border-white/5 pb-2 mb-4 relative z-20">
                                {TIMELINE_MARKERS.map((marker) => (
                                    <span key={marker}>{marker}</span>
                                ))}
                            </div>

                            {/* Tracks */}
                            <div className="space-y-3 relative z-20">
                                {/* Track 1: Client Node */}
                                <div className="flex items-center gap-4">
                                    <div className="w-24 text-[10px] font-bold text-white/50 uppercase">Client Node</div>
                                    <div className="flex-1 h-8 bg-white/5 rounded-md relative overflow-hidden border border-white/5">
                                        <div className="absolute top-0 bottom-0 left-[10%] right-[20%] bg-white/10 rounded-md border border-white/10 flex items-center px-3">
                                            <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_5px_rgba(233,84,32,1)]"></div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Track 2: Network Flow */}
                                <div className="flex items-center gap-4">
                                    <div className="w-24 text-[10px] font-bold text-brand-primary/80 uppercase">Network</div>
                                    <div className="flex-1 h-8 bg-white/5 rounded-md relative overflow-hidden border border-white/5">
                                        <div className="absolute top-0 bottom-0 left-[20%] right-[30%] bg-brand-primary/20 rounded-md border border-brand-primary/30 flex items-center px-3">
                                            <div className="flex gap-1 w-full justify-between items-center px-4">
                                                <div className="w-1.5 h-1.5 transform rotate-45 bg-white shadow-[0_0_5px_white]"></div>
                                                <div className="h-px flex-1 bg-brand-primary/50 mx-2"></div>
                                                <div className="w-1.5 h-1.5 transform rotate-45 bg-white shadow-[0_0_5px_white]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Sub Features Grid below Canvas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 md:mt-20 max-w-6xl w-full">
                    {FEATURE_CARDS.map((feature) => (
                        <div key={feature.title} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left transition-all duration-500 hover:-translate-y-1 hover:bg-white/[0.04] group">
                            <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0 border border-brand-primary/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(233,84,32,0)] group-hover:shadow-[0_0_30px_rgba(233,84,32,0.15)]">
                                <feature.icon className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div>
                                <h4 className="mb-2 text-base font-bold tracking-wide text-white">{feature.title}</h4>
                                <p className="max-w-sm text-sm font-medium leading-relaxed text-white/40">{feature.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
