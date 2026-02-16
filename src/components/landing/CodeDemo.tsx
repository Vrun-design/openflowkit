import React from 'react';
import { Box, Database, Globe, MousePointer2, Search, Sidebar } from 'lucide-react';

export function CodeDemo(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-brand-border/80 bg-white overflow-hidden shadow-2xl shadow-brand-primary/5 flex flex-col md:flex-row min-h-[500px] md:h-[640px] relative group ring-1 ring-black/5 select-none">
      
      {/* Visual Editor Side (Light) */}
      <div className="w-full h-[300px] md:h-auto md:w-[60%] bg-[#F9FAFB] relative overflow-hidden border-b md:border-b-0 md:border-r border-brand-border order-1 group/canvas">
         {/* Refined Dot Pattern - Lighter */}
         <div className="absolute inset-0 bg-[radial-gradient(#E5E7EB_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
         
         {/* Floating Toolbar */}
         <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-brand-border rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-2 py-1.5 flex gap-1 z-20 hover:scale-105 transition-transform ring-1 ring-black/5">
            <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center cursor-pointer shadow-md shadow-brand-primary/20">
               <MousePointer2 className="w-4 h-4 fill-current" />
            </div>
            <div className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer transition-colors">
               <Box className="w-4 h-4" />
            </div>
             <div className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer transition-colors">
               <Database className="w-4 h-4" />
            </div>
         </div>

         {/* Canvas Content */}
         <div className="absolute inset-0 flex items-center justify-center scale-75 md:scale-100 origin-center">
            
            {/* Connection Line - Polished with Gradient */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               <defs>
                 <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                   <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
                 </marker>
                 <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#CBD5E1" />
                    <stop offset="100%" stopColor="#94A3B8" />
                 </linearGradient>
               </defs>
               <path 
                d="M 320 280 C 400 280, 400 380, 480 380" 
                stroke="url(#line-gradient)" 
                strokeWidth="2" 
                strokeDasharray="6 4" 
                fill="none" 
                markerEnd="url(#arrowhead)" 
                className="transition-all duration-500 animate-[dash_30s_linear_infinite] opacity-60" 
               />
            </svg>

            {/* Draggable Card 1 */}
            <div className="absolute top-[30%] md:top-[30%] left-[10%] md:left-[20%] w-64 bg-white rounded-xl border border-brand-border shadow-panel hover:shadow-panel-hover hover:border-brand-primary/30 transition-all cursor-grab active:cursor-grabbing z-10 group/card ring-1 ring-black/5">
                <div className="p-3 border-b border-brand-border/50 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span className="font-semibold text-xs text-brand-primary font-mono tracking-tight">Checkout Service</span>
                    </div>
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>latency</span>
                        <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">45ms</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-brand-primary rounded-full"></div>
                    </div>
                </div>
                {/* Active User Cursor - Polished */}
                <div className="absolute -right-3 -bottom-3 flex items-center gap-1 animate-float z-20">
                   <MousePointer2 className="w-4 h-4 text-brand-purple fill-brand-purple drop-shadow-md" />
                   <div className="bg-brand-purple/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/20">
                      You
                   </div>
                </div>
            </div>

            {/* Draggable Card 2 */}
             <div className="absolute bottom-[30%] md:bottom-[30%] right-[10%] md:right-[20%] w-64 bg-white rounded-xl border border-brand-border shadow-panel hover:shadow-panel-hover hover:border-brand-primary/30 transition-all cursor-grab active:cursor-grabbing z-10 ring-1 ring-black/5">
                <div className="p-3 border-b border-brand-border/50 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                        <span className="font-semibold text-xs text-brand-primary font-mono tracking-tight">Payment DB</span>
                    </div>
                    <Database className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="p-4 grid grid-cols-4 gap-2">
                     <div className="aspect-square bg-blue-50/50 rounded border border-blue-100"></div>
                     <div className="aspect-square bg-blue-50/50 rounded border border-blue-100"></div>
                     <div className="aspect-square bg-blue-50/50 rounded border border-blue-100"></div>
                     <div className="aspect-square bg-blue-50/20 rounded border border-blue-100 opacity-50 border-dashed"></div>
                </div>
            </div>
         </div>
      </div>

      {/* Code Editor Side (Dark Mode) */}
      <div className="w-full md:w-[40%] bg-[#0D0E12] flex flex-col order-2 font-mono text-[13px] h-[300px] md:h-auto border-l border-white/5">
          {/* Editor Header */}
          <div className="h-10 flex items-center justify-between px-4 bg-[#0D0E12] border-b border-white/5 select-none shrink-0">
              <div className="flex gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FEBC2E]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#28C840]"></div>
              </div>
              <div className="text-[11px] text-white/40 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-md border border-white/5 group-hover:bg-white/10 transition-colors">
                 <Search className="w-3 h-3" />
                 flow.tsx
              </div>
              <Sidebar className="w-4 h-4 text-white/20 hover:text-white/50 transition-colors" />
          </div>
          
          {/* Editor Content - Polished Colors */}
          <div className="flex-1 p-6 leading-7 text-gray-400 overflow-y-auto custom-scrollbar selection:bg-brand-blue/30 selection:text-white">
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">1</span>
                 <div><span className="text-[#C678DD]">import</span> <span className="text-[#E5C07B]">{`{ Node, Edge }`}</span> <span className="text-[#C678DD]">from</span> <span className="text-[#98C379]">'@openflowkit/core'</span>;</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">2</span>
                 <div>&nbsp;</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">3</span>
                 <div className="italic text-gray-500"><span className="text-[#56B6C2]">/** Defines the Checkout Service */</span></div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">4</span>
                 <div><span className="text-[#C678DD]">export const</span> <span className="text-[#61AFEF]">checkoutNode</span> = <span className="text-[#C678DD]">new</span> <span className="text-[#E5C07B]">Node</span>({`{`}</div>
             </div>
             <div className="flex bg-[#1E222A] border-l-2 border-brand-blue -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">5</span>
                 <div className="pl-4">id: <span className="text-[#98C379]">'checkout-service'</span>,</div>
             </div>
             <div className="flex bg-[#1E222A] border-l-2 border-brand-blue -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">6</span>
                 <div className="pl-4">type: <span className="text-[#98C379]">'service'</span>,</div>
             </div>
             <div className="flex bg-[#1E222A] border-l-2 border-brand-blue -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">7</span>
                 <div className="pl-4">metadata: <span className="text-[#E5C07B]">ServerConfig</span>,</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">8</span>
                 <div>{`});`}</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">9</span>
                 <div>&nbsp;</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">10</span>
                 <div><span className="text-[#C678DD]">const</span> <span className="text-[#61AFEF]">connection</span> = <span className="text-[#61AFEF]">checkoutNode</span>.<span className="text-[#61AFEF]">connectTo</span>({`{`}</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">11</span>
                 <div className="pl-4">target: <span className="text-[#98C379]">'payment-db'</span>,</div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">12</span>
                 <div className="pl-4">kind: <span className="text-[#98C379]">'TCP/IP'</span></div>
             </div>
             <div className="flex group hover:bg-white/5 transition-colors -mx-6 px-6">
                 <span className="w-8 text-gray-700 select-none text-right mr-4 text-[11px] pt-0.5 font-medium">13</span>
                 <div>{`});`}</div>
             </div>
          </div>
          
          {/* Editor Status Bar */}
          <div className="h-7 border-t border-white/5 flex items-center justify-between px-3 bg-[#0D0E12] select-none shrink-0 hidden sm:flex">
             <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#28C840]"></div>
                    <span className="text-[10px] text-white/50 font-medium">Ready</span>
                 </div>
                 <div className="w-px h-3 bg-white/10"></div>
                 <span className="text-[10px] text-white/30">master*</span>
             </div>
             <div className="flex items-center gap-3 text-[10px] text-white/30">
                 <span>Ln 13, Col 4</span>
                 <span>TypeScript React</span>
                 <span>UTF-8</span>
             </div>
          </div>
      </div>

    </div>
  );
}