import React from 'react';
import { Github, ArrowUpRight, GitPullRequest, Construction, Users, Map, CheckCircle2, CircleDashed } from 'lucide-react';

export function Testimonials(): React.ReactElement {
  return (
    <section className="py-32 bg-[#08090A] border-t border-white/5 relative overflow-hidden select-none">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1a1a1a_0%,transparent_70%)] pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 mb-6 font-mono text-[10px] uppercase tracking-widest font-bold">
                    <Construction className="w-3 h-3" />
                    <span>Under Construction</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-4 leading-[0.9]">
                    Build in public. <br/>
                    <span className="font-serif italic font-normal text-white/50">Shape the engine.</span>
                </h2>
                <p className="text-xl text-white/50 leading-relaxed max-w-lg font-medium">
                    OpenFlowKit is just getting started. We are building the core engine in the open. Join us on Day 1.
                </p>
            </div>
            
            <div className="flex items-center gap-4">
                <a href="https://github.com/openflowkit/engine" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-200 transition-colors">
                    <Github className="w-4 h-4" />
                    Star the Repo
                </a>
            </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* GitHub Card */}
            <a href="https://github.com/openflowkit" target="_blank" className="group relative bg-[#111] rounded-2xl p-8 border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[340px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-20"></div>
                
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                        <Github className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                </div>
                
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Open Source</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-6">
                        The core engine is MIT licensed. Read the source, submit PRs, or fork it for your internal tools.
                    </p>
                    <div className="flex items-center gap-3 text-xs font-mono text-white/40">
                         <span className="flex items-center gap-1"><GitPullRequest className="w-3 h-3" /> PRs Welcome</span>
                    </div>
                </div>
            </a>

            {/* Community Card */}
            <div className="group relative bg-[#111] rounded-2xl p-8 border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[340px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-[60px] -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-20"></div>
                
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5 text-brand-blue" />
                    </div>
                </div>
                
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Community</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-6">
                        Join developers building on OpenFlowKit.
                    </p>
                    
                    <div className="flex items-center -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#111] bg-white/10 overflow-hidden relative z-0 hover:z-10 transition-transform hover:scale-110">
                                <img 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 14}`} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover bg-white/5"
                                />
                            </div>
                        ))}
                        <div className="w-10 h-10 rounded-full border-2 border-[#111] bg-[#222] flex items-center justify-center text-[10px] text-white font-medium z-0">
                            +500
                        </div>
                    </div>
                </div>
            </div>

            {/* Roadmap Card */}
            <div className="group relative bg-[#111] rounded-2xl p-8 border border-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[340px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px] -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-20"></div>
                
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                        <Map className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] font-mono text-white/30 border border-white/10 px-2 py-1 rounded bg-white/5">Q1 2025</span>
                </div>
                
                <div>
                    <h3 className="text-xl font-bold text-white mb-4">Roadmap</h3>
                    <div className="space-y-3">
                         <div className="flex items-center gap-3">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="text-white/60 text-sm line-through decoration-white/20">Core Renderer</span>
                         </div>
                         <div className="flex items-center gap-3">
                             <CircleDashed className="w-4 h-4 text-purple-400 animate-spin-slow" />
                             <span className="text-white text-sm font-medium">Collaboration Sync</span>
                         </div>
                         <div className="flex items-center gap-3 opacity-40">
                             <div className="w-4 h-4 rounded-full border border-white/30"></div>
                             <span className="text-white text-sm">Plugin System</span>
                         </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </section>
  );
}