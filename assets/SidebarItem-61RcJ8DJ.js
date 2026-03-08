import{j as e}from"./vendor-motion-DvwQhRCO.js";import{aq as h}from"./index-BBAFjiwS.js";const u=({children:m,icon:d,to:t,onClick:r,isActive:s,className:a="",end:o=!1,testId:n})=>{const i="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors w-full text-left group",l="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium",x="text-slate-600 hover:bg-slate-50 hover:text-slate-900",c=e.jsxs(e.Fragment,{children:[d&&e.jsx("span",{className:"shrink-0 flex items-center justify-center",children:d}),e.jsx("span",{className:"flex-1 flex items-center justify-between truncate min-w-0",children:m})]});return t?t.startsWith("http")||t.startsWith("#")?e.jsx("a",{href:t,target:t.startsWith("http")?"_blank":void 0,rel:t.startsWith("http")?"noopener noreferrer":void 0,onClick:r,"data-testid":n,className:`
                        ${i}
                        ${s?l:x}
                        ${a}
                    `,children:c}):e.jsx(h,{to:t,end:o,className:({isActive:f})=>`
                    ${i}
                    ${f||s?l:x}
                    ${a}
                `,onClick:r,"data-testid":n,children:c}):e.jsx("button",{onClick:r,"data-testid":n,className:`
                ${i}
                ${s?l:x}
                ${a}
            `,children:c})};export{u as S};
