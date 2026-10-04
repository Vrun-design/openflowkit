/** Decorative illustrations for empty and failure states: draw once, then rest. */
export type V2StateHeroKind = 'no-canvas' | 'torn-page' | 'lost-link';

export function V2StateHero({ kind }: { readonly kind: V2StateHeroKind }): React.JSX.Element {
  return (
    <svg className="ofk-state-hero" data-kind={kind} viewBox="0 0 120 72" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'no-canvas' ? <>
        <rect x="8" y="22" width="32" height="26" rx="5" strokeDasharray="4 3" />
        <rect x="80" y="22" width="32" height="26" rx="5" strokeDasharray="4 3" />
        <path className="ofk-state-hero-link" d="M42 35 H78" />
        <circle className="ofk-state-hero-accent" cx="60" cy="35" r="3" />
      </> : kind === 'torn-page' ? <>
        <path d="M38 8 H72 L84 20 V36 L77 40 L70 35 L63 40 L56 35 L49 40 L42 35 L38 37 Z" />
        <path d="M72 8 V20 H84" />
        <g className="ofk-state-hero-tear">
          <path d="M38 43 L42 41 L49 46 L56 41 L63 46 L70 41 L77 46 L84 42 V64 H38 Z" />
          <path d="M46 54 H70 M46 59 H62" />
        </g>
      </> : <>
        <rect x="6" y="24" width="30" height="24" rx="5" />
        <rect className="ofk-state-hero-accent-box" x="84" y="24" width="30" height="24" rx="5" />
        <path className="ofk-state-hero-half ofk-state-hero-left" d="M38 36 H56" pathLength="1" />
        <path className="ofk-state-hero-half ofk-state-hero-right" d="M64 36 H82" pathLength="1" />
      </>}
    </svg>
  );
}
