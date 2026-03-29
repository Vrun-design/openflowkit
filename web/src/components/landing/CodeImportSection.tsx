import React from 'react';
import { Code2, ArrowRight, Database, Wand2 } from 'lucide-react';

export function CodeImportSection(): React.ReactElement {
    return (
        <section className="py-24 md:py-32 bg-brand-canvas relative overflow-hidden border-t border-brand-border/40">
            <div className="container mx-auto px-6 relative z-10 flex justify-center">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 max-w-7xl">

                    {/* Visual Area (Left side) */}
                    <div className="w-full lg:w-[55%] relative perspective-1000 order-2 lg:order-1">
                        <div className="relative h-[480px] w-full flex items-center justify-center scale-90 sm:scale-100">

                            {/* Abstract connection arrow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center">
                                <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-brand-secondary border border-brand-border">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Left Card: Code */}
                            <div className="absolute md:left-4 top-4 md:top-1/2 md:-translate-y-1/2 w-[300px] md:w-[280px] h-[360px] bg-[#1a1b26] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] p-5 transform md:-rotate-[6deg] transition-all hover:-rotate-[2deg] hover:z-30 border border-gray-800 z-10 font-mono text-[11px] overflow-hidden">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-700/50 pb-3">
                                    <div className="flex gap-1.5 align-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
                                    </div>
                                    <span className="text-gray-400/80 text-[10px]">schema.prisma</span>
                                </div>
                                <div className="text-[#bb9af7]">model <span className="text-[#7aa2f7]">User</span> {'{'}</div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">id<span className="text-[#565f89] pl-6">Int @id</span></div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">email<span className="text-[#565f89] pl-3">String @unique</span></div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">posts<span className="text-[#565f89] pl-3">Post[]</span></div>
                                <div className="text-[#bb9af7] mt-1">{'}'}</div>

                                <div className="text-[#bb9af7] mt-5">model <span className="text-[#7aa2f7]">Post</span> {'{'}</div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">id<span className="text-[#565f89] pl-6">Int @id</span></div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">title<span className="text-[#565f89] pl-3">String</span></div>
                                <div className="pl-4 text-[#a9b1d6] leading-relaxed">author<span className="text-[#565f89] pl-2 text-[#bb9af7]">User</span></div>
                                <div className="text-[#bb9af7] mt-1">{'}'}</div>

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#1a1b26] to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 text-[#7aa2f7] px-4 py-1.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm whitespace-nowrap">
                                    <Database className="w-3 h-3" /> Schema Detected
                                </div>
                            </div>

                            {/* Right Card: Diagram */}
                            <div className="absolute md:right-0 bottom-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2 w-[300px] md:w-[320px] h-[360px] bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-5 transform md:rotate-[6deg] transition-all hover:rotate-[2deg] hover:z-30 border border-gray-200 z-0">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-brand-primary/10 flex items-center justify-center">
                                            <Wand2 className="w-3 h-3 text-brand-primary" />
                                        </div>
                                        <span className="text-[11px] font-bold text-brand-dark uppercase tracking-widest">Generated Canvas</span>
                                    </div>
                                </div>
                                <div className="relative h-[255px] bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:16px_16px] rounded-lg border border-brand-border p-4 overflow-hidden shadow-inner bg-gray-50/50">

                                    {/* Abstract Entity Diagram */}
                                    <div className="absolute top-6 left-6 w-36 bg-white border border-blue-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="bg-blue-50/80 px-3 py-2 text-[11px] font-bold text-blue-800 border-b border-blue-100">
                                            User
                                        </div>
                                        <div className="px-3 py-2 text-[10px] text-gray-600 font-mono space-y-1.5">
                                            <div className="flex justify-between items-center"><span className="font-medium text-gray-800">id</span> <span className="text-gray-400">Int</span></div>
                                            <div className="flex justify-between items-center"><span className="font-medium text-gray-800">email</span> <span className="text-gray-400">String</span></div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-6 right-6 w-36 bg-white border border-purple-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                        <div className="bg-purple-50/80 px-3 py-2 text-[11px] font-bold text-purple-800 border-b border-purple-100">
                                            Post
                                        </div>
                                        <div className="px-3 py-2 text-[10px] text-gray-600 font-mono space-y-1.5">
                                            <div className="flex justify-between items-center"><span className="font-medium text-gray-800">id</span> <span className="text-gray-400">Int</span></div>
                                            <div className="flex justify-between items-center"><span className="font-medium text-gray-800">title</span> <span className="text-gray-400">String</span></div>
                                        </div>
                                    </div>

                                    {/* SVG Arrow */}
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
                                        <path d="M 120 100 C 130 160, 160 170, 160 180" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" markerEnd="url(#arrowhead)" />
                                        <defs>
                                            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                                                <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                                            </marker>
                                        </defs>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Copy Side (Right side) */}
                    <div className="lg:w-[45%] text-center lg:text-left order-1 lg:order-2 space-y-8">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-brand-border shadow-sm text-[10px] uppercase tracking-widest font-bold text-brand-dark mb-6 font-mono">
                                <Code2 className="w-3 h-3 text-brand-primary" />
                                Smart Import Engine
                            </div>

                            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-brand-dark leading-[0.9] mb-6">
                                Paste your code.<br />
                                <span className="font-serif italic font-normal text-brand-primary">See your architecture.</span>
                            </h2>

                            <p className="text-lg text-brand-secondary leading-relaxed font-medium">
                                Don&apos;t draw boxes manually. Paste JSON, React components, Prisma schemas, or SQL dumps into OpenFlowKit. Our AI engine parses the relationships and builds a living canvas instantly.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                            {['Prisma', 'SQL', 'TypeScript', 'JSON', 'GitHub'].map((tech) => (
                                <div key={tech} className="px-4 py-2 bg-white border border-brand-border text-xs font-semibold text-brand-secondary rounded-lg shadow-sm hover:border-brand-primary/40 hover:shadow transition-all cursor-default">
                                    {tech}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
