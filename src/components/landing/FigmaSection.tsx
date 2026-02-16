import React from 'react';
import { Figma, ArrowRight, Command, Type, Layers, Scissors } from 'lucide-react';

export function FigmaSection(): React.ReactElement {
    return (
        <section id="figma" className="py-24 md:py-32 bg-[#F2F4F7] relative overflow-hidden border-y border-white">
            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                    {/* Copy Side */}
                    <div className="lg:w-1/2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-[10px] uppercase tracking-widest font-bold text-gray-900 mb-8 font-mono">
                            <Scissors className="w-3 h-3" />
                            Zero Plugins Required
                        </div>

                        <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter text-gray-900 leading-[0.9]">
                            Copy the code.<br />
                            <span className="font-serif italic font-normal text-brand-primary">Paste the design.</span>
                        </h2>

                        <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0 font-medium">
                            OpenFlowKit puts high-fidelity SVG and text directly on your clipboard. Paste into Figma to get editable text layers and perfect vector shapes. What you see is exactly what you get.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Type className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Editable Text</span>
                            </div>
                            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <Layers className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Vector Fidelity</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Side */}
                    <div className="w-full lg:w-1/2 relative perspective-1000">
                        <div className="relative h-[400px] w-full flex items-center justify-center">

                            {/* Arrow Connector */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-gray-100">
                                    <ArrowRight className="w-5 h-5 text-gray-400" />
                                </div>
                            </div>

                            {/* Left Card: Code */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[260px] h-[300px] bg-[#1e1e1e] rounded-xl shadow-2xl p-4 transform -rotate-6 transition-transform hover:-rotate-3 border border-gray-800 z-10">
                                <div className="flex gap-1.5 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-2/3 bg-gray-700 rounded opacity-50"></div>
                                    <div className="h-2 w-full bg-gray-700 rounded opacity-30"></div>
                                    <div className="h-2 w-3/4 bg-gray-700 rounded opacity-40"></div>
                                    <div className="h-20 w-full border border-dashed border-gray-700 rounded mt-4 flex items-center justify-center">
                                        <span className="text-xs text-gray-500 font-mono">Selected</span>
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1 rounded text-[10px] text-white font-mono border border-white/5 flex items-center gap-1">
                                    <Command className="w-3 h-3" /> C
                                </div>
                            </div>

                            {/* Right Card: Figma */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[260px] h-[300px] bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-4 transform rotate-6 transition-transform hover:rotate-3 border border-gray-200 z-0">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                    <div className="flex items-center gap-1">
                                        <Figma className="w-3 h-3 text-[#0ACF83]" />
                                        <span className="text-[10px] font-bold text-gray-900">Untitled</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-24 w-full bg-[#0ACF83]/10 border border-[#0ACF83] border-dashed rounded flex items-center justify-center">
                                        <span className="text-xs text-[#0ACF83] font-bold">Vector + Text</span>
                                    </div>
                                    <div className="h-2 w-1/2 bg-gray-100 rounded"></div>
                                    <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
                                </div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-100 px-3 py-1 rounded text-[10px] text-gray-600 font-mono border border-gray-200 flex items-center gap-1">
                                    <Command className="w-3 h-3" /> V
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}