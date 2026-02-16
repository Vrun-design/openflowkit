import React from 'react';
import { Image, Lock, AlertTriangle, MousePointer2 } from 'lucide-react';

export function ProblemSection(): React.ReactElement {
  return (
    <section className="py-32 bg-[#111111] text-white relative overflow-hidden select-none">
      {/* Background Grid - Dark Mode */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.07]"></div>
      
      {/* Gradient Fog */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#111111] to-transparent z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[#111111] to-transparent z-10"></div>

      <div className="container mx-auto px-6 relative z-20">
        
        {/* Header */}
        <div className="mb-24 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-8 font-mono text-[10px] uppercase tracking-widest font-bold">
                <AlertTriangle className="w-3 h-3" />
                <span>The Problem</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-[0.9] tracking-tighter text-white">
                Why do diagrams <br/>
                <span className="font-serif italic text-white/50 font-normal">always feel like a chore?</span>
            </h2>
            <p className="text-xl text-white/50 leading-relaxed max-w-2xl font-medium">
                We are building advanced distributed systems with tools designed for elementary school scrapbooking. 
            </p>
        </div>

        {/* Grid of Pain */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: The Alignment Hell */}
            <div className="group relative bg-[#1A1A1A] rounded-2xl p-8 hover:bg-[#222] transition-colors duration-500 overflow-hidden min-h-[360px] flex flex-col border border-white/5 hover:border-white/10">
                <div className="flex-1 relative w-full flex items-center justify-center">
                    {/* Visual: Misalignment */}
                    <div className="relative w-40 h-32">
                        {/* Box A */}
                        <div className="absolute top-0 left-4 w-24 h-24 border border-white/20 rounded-lg bg-white/5 flex items-center justify-center">
                             <span className="font-mono text-[10px] text-white/30">A</span>
                        </div>
                        {/* Box B - Animated Misalignment */}
                        <div className="absolute top-6 left-20 w-24 h-24 border border-red-500/50 rounded-lg bg-red-500/10 flex items-center justify-center animate-[pulse_4s_infinite]">
                             <span className="font-mono text-[10px] text-red-400">B</span>
                             
                             {/* The "1px off" indicator */}
                             <div className="absolute -top-3 left-0 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-red-500 text-white text-[9px] px-1 rounded font-mono shadow-lg">1px off</span>
                             </div>
                        </div>
                        
                        {/* Cursor */}
                        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-0 group-hover:translate-y-0">
                            <MousePointer2 className="w-5 h-5 text-white fill-white" />
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-3 text-white">Pixel Purgatory</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                        Wasting hours aligning boxes by hand. One new service breaks your entire layout.
                    </p>
                </div>
            </div>

            {/* Card 2: The Screenshot Rot */}
            <div className="group relative bg-[#1A1A1A] rounded-2xl p-8 hover:bg-[#222] transition-colors duration-500 overflow-hidden min-h-[360px] flex flex-col border border-white/5 hover:border-white/10">
                <div className="flex-1 relative w-full flex items-center justify-center">
                    {/* Visual: Image Card */}
                    <div className="relative w-32 h-40 bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2 group-hover:blur-[2px] transition-all duration-700">
                        <div className="w-full h-2 bg-white/10 rounded-full"></div>
                        <div className="w-2/3 h-2 bg-white/10 rounded-full"></div>
                        <div className="mt-4 w-full h-20 bg-white/5 rounded border border-dashed border-white/10 flex items-center justify-center">
                            <Image className="w-6 h-6 text-white/20" />
                        </div>
                    </div>
                    
                    {/* Overlay Warning */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                        <div className="bg-black/80 backdrop-blur-md border border-red-500/30 px-4 py-2 rounded-lg flex items-center gap-2 shadow-xl">
                             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                             <span className="text-xs font-mono text-red-400 font-bold">OUTDATED</span>
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-3 text-white">The Screenshot Trap</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                        Docs drift the moment you take the screenshot. Static assets are dead assets.
                    </p>
                </div>
            </div>

            {/* Card 3: The Style Prison */}
            <div className="group relative bg-[#1A1A1A] rounded-2xl p-8 hover:bg-[#222] transition-colors duration-500 overflow-hidden min-h-[360px] flex flex-col border border-white/5 hover:border-white/10">
                <div className="flex-1 relative w-full flex items-center justify-center">
                     <div className="flex items-center gap-4">
                        {/* Locked Color */}
                        <div className="relative group/lock">
                            <div className="w-16 h-16 rounded-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center border-4 border-[#1A1A1A] ring-1 ring-white/10">
                                <Lock className="w-5 h-5 text-white/90" />
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/30 uppercase tracking-wider opacity-0 group-hover/lock:opacity-100 transition-opacity">Locked</div>
                        </div>

                        {/* Desired Colors (Faded) */}
                        <div className="flex flex-col gap-2 opacity-30 blur-[1px] group-hover:blur-0 group-hover:opacity-50 transition-all">
                             <div className="w-8 h-8 rounded-full bg-purple-500 border border-white/10"></div>
                             <div className="w-8 h-8 rounded-full bg-pink-500 border border-white/10"></div>
                        </div>
                     </div>
                </div>
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-3 text-white">Enterprise Beige</h3>
                    <p className="text-sm text-white/40 leading-relaxed font-medium">
                        Locked into rigid, generic templates. Your architecture is unique; your diagrams shouldn't look like clipart.
                    </p>
                </div>
            </div>

        </div>
      </div>
    </section>
  );
}