import{j as t}from"./vendor-motion-DvwQhRCO.js";import{R as x,L as u}from"./vendor-lucide-DSGzOVYV.js";import{ai as y}from"./index-BBAFjiwS.js";const g=x.forwardRef(({className:o="",variant:n="primary",size:d="md",shape:i="default",isLoading:e,icon:r,children:a,disabled:l,...m},p)=>{const s=y()==="beveled",b="inline-flex items-center justify-center font-medium transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",c={primary:`
            bg-[var(--brand-primary)] text-white 
            ${s?"btn-beveled-primary":"shadow-sm hover:shadow-md"}
            hover:brightness-110
        `.replace(/\s+/g," ").trim(),secondary:`
            bg-white text-slate-700 border border-slate-200 
            ${s?"btn-beveled-secondary":"shadow-sm hover:shadow-md"}
            hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary-200)]
        `.replace(/\s+/g," ").trim(),ghost:"text-slate-500 hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] transition-colors",danger:"bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 active:scale-95",icon:"text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95"},h={sm:"h-8 px-3 text-xs gap-1.5",md:"h-10 px-4 text-sm gap-2",lg:"h-12 px-6 text-base gap-2.5",xl:"h-14 px-8 text-lg font-semibold gap-2.5",icon:"h-9 w-9 p-0"},v={default:"rounded-[var(--radius-md)]",pill:"rounded-full",square:"rounded-none"};return t.jsxs("button",{ref:p,className:`
                ${b}
                ${c[n]}
                ${h[d]}
                ${v[i]}
                ${o}
            `,disabled:l||e,...m,children:[e&&t.jsx(u,{className:"w-4 h-4 mr-2 animate-spin"}),!e&&r&&t.jsx("span",{className:"",children:r}),a]})});g.displayName="Button";export{g as B};
