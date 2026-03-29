import React from 'react';
import { WandSparkles, FileCode, ShieldCheck, HardDrive, Layers, Lock, Key } from 'lucide-react';

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
                        <span className="font-serif italic font-normal text-brand-primary">Nothing you don&apos;t.</span>
                    </h2>
                    <p className="text-xl text-brand-secondary max-w-2xl leading-relaxed font-medium opacity-0 animate-slide-up [animation-delay:400ms] text-balance">
                        The ultimate white-label canvas. Fully customizable nodes, edges, and themes — powered by React Flow. It&apos;s your brand, given infinite space to breathe.
                    </p>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(340px,auto)]">

                    {/* Card 1: Advanced Diagram as Code (Span 8) */}
                    <div className="col-span-1 md:col-span-12 lg:col-span-8 order-1 bg-white rounded-[var(--radius-3xl)] border border-brand-border p-8 md:p-12 relative overflow-hidden group hover:shadow-2xl hover:shadow-brand-blue/5 transition-all duration-700 flex flex-col justify-between">

                        <div className="absolute top-0 right-0 w-[60%] h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>

                        <div className="relative z-10 max-w-[50%]">
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center mb-6 shadow-lg shadow-brand-primary/20">
                                <FileCode className="w-6 h-6" />
                            </div>
                            <h3 className="text-3xl font-bold text-brand-dark mb-4 tracking-tight">Diagram as Code</h3>
                            <p className="text-brand-secondary text-lg leading-relaxed pr-8">
                                First-class support for our type-safe DSL. Define nodes in code and let the engine handle the layout.
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
                                    <div className="text-gray-400">{'// define.ts'}</div>
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
                    <div className="col-span-1 md:col-span-6 lg:col-span-5 order-3 bg-[#0A0A0A] rounded-[var(--radius-3xl)] p-8 md:p-12 flex flex-col relative overflow-hidden group border border-white/10 shadow-2xl min-h-[400px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#222_0%,transparent_60%)]"></div>

                        {/* Content Top */}
                        <div className="relative z-20 mb-auto">
                            <div className="flex items-center gap-2 mb-3 text-brand-blue font-mono text-[10px] uppercase tracking-widest">
                                <WandSparkles className="w-3 h-3" />
                                <span>AI Assistant</span>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Flowpilot AI</h3>
                            <p className="text-white/60 text-base leading-relaxed">
                                Chat with your diagram in natural language to build and style blocks instantly.
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
                                            <WandSparkles className="w-3 h-3 text-brand-blue animate-pulse" />
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

                    {/* Card 3: Local First (Span 4) */}
                    <div className="col-span-1 md:col-span-6 lg:col-span-4 order-2 bg-white rounded-[var(--radius-3xl)] border border-brand-border p-8 md:p-12 flex flex-col justify-between group hover:border-brand-primary/20 transition-all relative overflow-hidden min-h-[320px]">
                        <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-700 pointer-events-none">
                            <ShieldCheck className="w-64 h-64" />
                        </div>

                        <div className="relative z-10 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 mb-6 group-hover:scale-110 transition-transform border border-gray-100">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3">Local &amp; Private</h3>
                            <p className="text-brand-secondary text-base leading-relaxed">
                                Everything stays on your machine. No cloud tracking, no forced syncing. You have full freedom.
                            </p>
                        </div>

                        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[11px] font-mono text-gray-600 font-medium whitespace-nowrap">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Offline Ready
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[11px] font-mono text-gray-600 font-medium whitespace-nowrap">
                                <HardDrive className="w-3 h-3" />
                                Local File System
                            </div>
                        </div>
                    </div>

                    {/* Card 4: BYOK (Span 4) */}
                    <div className="col-span-1 md:col-span-6 lg:col-span-4 order-5 bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 rounded-[var(--radius-3xl)] border border-brand-border p-8 md:p-12 flex flex-col justify-between group hover:border-emerald-200 transition-all relative overflow-hidden min-h-[320px]">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30"></div>
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-brand-blue/20 to-emerald-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>

                        <div className="relative z-10 max-w-md">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform border border-emerald-100/50">
                                <Key className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3">Bring Your Own Key</h3>
                            <p className="text-brand-secondary text-base leading-relaxed">
                                Plug in your own OpenAI or Anthropic keys. Stored securely on your device, avoiding all vendor lock-ins.
                            </p>
                        </div>

                        {/* Visual: API Key Input */}
                        <div className="relative z-10 mt-8 w-full max-w-[280px]">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3 transform group-hover:-translate-y-1 transition-transform">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-emerald-600" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">OpenAI API Key</div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex gap-0.5">
                                            {[...Array(12)].map((_, i) => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                            ))}
                                        </div>
                                        <span className="text-xs font-mono text-gray-600 ml-1">v4X9</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 5: Export Everywhere (Span 7) */}
                    <div className="col-span-1 md:col-span-12 lg:col-span-7 order-4 bg-[#0A0A0A] rounded-[var(--radius-3xl)] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group shadow-2xl min-h-[380px]">
                        <div className="relative z-20 max-w-lg mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-6 border border-white/10 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download-cloud"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12v9" /><path d="m8 17 4 4 4-4" /></svg>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Export Everywhere</h3>
                            <p className="text-white/60 text-lg leading-relaxed">
                                Export to native Figma vector layers, pristine SVG, PNG, or JSON. Your diagrams are instantly portable.
                            </p>
                        </div>
                        
                        {/* Polished Visual: Format Dock */}
                        <div className="relative z-10 mt-auto flex items-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md self-start group-hover:-translate-y-2 transition-transform duration-500 shadow-2xl shadow-black/50 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/5 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-pink-400"></div><span className="text-xs font-mono font-medium text-white/90">.fig</span>
                                </div>
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/5 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div><span className="text-xs font-mono font-medium text-white/90">.svg</span>
                                </div>
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/5 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-xs font-mono font-medium text-white/90">.png</span>
                                </div>
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/5 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div><span className="text-xs font-mono font-medium text-white/90">.mp4</span>
                                </div>
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 border border-white/5 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-400"></div><span className="text-xs font-mono font-medium text-white/90">.gif</span>
                                </div>
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <div className="flex items-center justify-center px-4 py-2 rounded-xl bg-transparent border border-white/5 border-dashed gap-2 text-white/40 group-hover:text-white/70 transition-colors">
                                    <span className="text-xs font-mono font-medium">+.json</span>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Card 7: Auto-Layout (Span 4) */}
                    <div className="col-span-1 md:col-span-6 lg:col-span-4 order-6 bg-white rounded-[var(--radius-3xl)] border border-brand-border p-8 md:p-12 flex flex-col justify-between group hover:border-gray-300 transition-all min-h-[380px] overflow-hidden">
                        <div className="relative z-20">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-700 mb-6 border border-gray-200 group-hover:scale-110 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-merge"><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M6 21V9a9 9 0 0 0 9 9" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3 tracking-tight">Smart Auto-Layout</h3>
                            <p className="text-brand-secondary text-base leading-relaxed">
                                Powered by ELK.js to automatically route edges and perfectly snap nodes into alignment.
                            </p>
                        </div>
                        
                        {/* Polished Visual: Orthogonal Node Tree */}
                        <div className="relative z-10 mt-12 w-full flex justify-center items-center h-28">
                            <div className="relative w-[180px] h-[100px] border-t border-r border-brand-primary/20 rounded-tr-xl transform group-hover:-translate-y-2 transition-transform duration-500">
                                {/* Flow line glow effect */}
                                <div className="absolute top-0 right-0 w-0 h-px bg-brand-primary shadow-[0_0_8px_brand-primary] group-hover:w-full transition-all duration-1000 ease-out"></div>
                                
                                {/* Node 1 (Root, Left) */}
                                <div className="absolute top-[-14px] left-[-28px] w-[56px] h-[28px] bg-white border shadow-sm rounded-lg flex items-center justify-center text-[8px] font-bold text-gray-700 ring-4 ring-white">APP</div>
                                
                                {/* Node 2 (Branch, Right Top) */}
                                <div className="absolute top-[-14px] right-[-28px] w-[56px] h-[28px] bg-brand-primary border-brand-primary shadow-md shadow-brand-primary/20 rounded-lg flex items-center justify-center text-[8px] font-bold text-white ring-4 ring-white">API</div>
                                
                                {/* SVG Line down to Database */}
                                <svg className="absolute top-0 right-[-14px] w-8 h-[100px]" viewBox="0 0 32 100">
                                    <path d="M14 0 L14 86 C14 93.7 20.3 100 28 100 L32 100" fill="none" className="stroke-brand-primary/20" strokeWidth="1" />
                                </svg>

                                {/* Node 3 (Branch, Right Bottom) */}
                                <div className="absolute bottom-[-14px] right-[-50px] w-[56px] h-[28px] bg-white border shadow-sm rounded-lg flex items-center justify-center text-[8px] font-bold text-gray-500 ring-4 ring-white">DB</div>
                            </div>
                        </div>
                    </div>

                    {/* Card 8: Real-Time Sync (Span 4) */}
                    <div className="col-span-1 md:col-span-12 lg:col-span-4 order-7 bg-gray-50/50 rounded-[var(--radius-3xl)] border border-brand-border p-8 md:p-12 flex flex-col justify-between group transition-colors min-h-[380px] overflow-hidden hover:bg-white">
                        <div className="relative z-20">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100 group-hover:scale-110 transition-transform duration-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-brand-dark mb-3 tracking-tight">Multiplayer Sync</h3>
                            <p className="text-brand-secondary text-base leading-relaxed">
                                Share a link and build together with true peer-to-peer WebRTC zero-latency live cursors.
                            </p>
                        </div>

                        {/* Polished Visual: Precision Cursors */}
                        <div className="relative z-10 mt-12 w-full flex justify-center items-center h-28 perspective-1000">
                            <div className="relative w-[180px] h-[80px] bg-white border border-gray-100 shadow-sm rounded-xl transform rotate-x-[15deg] group-hover:rotate-x-[0deg] transition-transform duration-500 flex items-center justify-center">
                                <div className="text-[10px] font-mono text-gray-400 border border-dashed border-gray-200 px-3 py-1 rounded">Shared Node Object</div>
                                
                                {/* Cursor 1 (Top Left) */}
                                <div className="absolute top-[-5px] left-[15px] transform group-hover:translate-x-4 transition-transform duration-700 delay-100">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm"><path d="M4.34315 2.15685L21.3137 19.1274C21.9056 19.7193 21.4862 20.7322 20.6482 20.7322H14.1252L9.88289 24.9745C9.28913 25.5683 8.27435 25.1473 8.27435 24.3075V2.85257C8.27435 2.01633 9.28659 1.59477 9.88045 2.18863L4.34315 2.15685Z" /></svg>
                                    <div className="absolute left-4 top-4 bg-[#F59E0B] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">Alex</div>
                                </div>
                                
                                {/* Cursor 2 (Bottom Right) */}
                                <div className="absolute bottom-[-15px] right-[25px] transform group-hover:-translate-x-6 group-hover:-translate-y-2 transition-transform duration-700 delay-300">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#10B981" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm"><path d="M4.34315 2.15685L21.3137 19.1274C21.9056 19.7193 21.4862 20.7322 20.6482 20.7322H14.1252L9.88289 24.9745C9.28913 25.5683 8.27435 25.1473 8.27435 24.3075V2.85257C8.27435 2.01633 9.28659 1.59477 9.88045 2.18863L4.34315 2.15685Z" /></svg>
                                    <div className="absolute left-4 top-4 bg-[#10B981] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">Sarah</div>
                                </div>
                            </div>
                        </div>
                    </div>



                </div>
            </div>
        </section>
    );
}
