import React, { useState, useEffect } from 'react';
import { Play, Copy, GitBranch, Terminal } from 'lucide-react';
import { Button } from './Button';

interface HeroSectionProps {
  onLaunch: () => void;
}

const ROTATING_WORDS = ["thinks", "draws", "builds", "scales"];

import { useFlowStore } from '../../store';

export function HeroSection({ onLaunch }: HeroSectionProps): React.ReactElement {
  const { brandConfig } = useFlowStore();
  const [index, setIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setIsExiting(false);
      }, 500); // Wait for exit animation
    }, 3000); // Total cycle time

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-24 pb-12 md:pt-36 md:pb-24 overflow-hidden select-none bg-brand-canvas">
      {/* Background Ambience with Dissolve Transition */}
      <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(to_bottom,black_0%,black_20%,rgba(0,0,0,0.8)_40%,rgba(0,0,0,0.4)_70%,transparent_100%)]">
        {/* Layered Primary Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Secondary Fine Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:10px_10px]"></div>

        {/* Architectural Intersection Dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#8080800C_1px,transparent_1px)] bg-[size:40px_40px] [background-position:center_center]"></div>

        {/* Ambient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-brand-blue/[0.015] rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-purple-500/[0.015] rounded-full blur-[120px] animate-pulse-slow [animation-delay:2s]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="animate-slide-up opacity-0 [animation-delay:0ms] inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary/60 mb-6 font-mono text-[10px] uppercase tracking-widest font-bold ring-1 ring-brand-primary/5">
          <Terminal className="w-3 h-3" />
          <span>v1.0 Public Beta</span>
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up opacity-0 [animation-delay:100ms] text-5xl sm:text-6xl md:text-[88px] font-bold tracking-[-0.04em] text-brand-dark mb-6 md:mb-8 max-w-5xl mx-auto leading-[1.1] text-balance">
          The diagram engine <br />
          <span className="font-serif italic font-normal text-brand-primary inline-flex items-center gap-[0.2em]">
            that
            <span
              key={ROTATING_WORDS[index]}
              className={`inline-block ${isExiting ? '[animation:text-exit_0.5s_ease-in_forwards]' : '[animation:text-reveal_0.5s_ease-out_forwards]'}`}
            >
              {ROTATING_WORDS[index]}
            </span>
            like you.
          </span>
        </h1>

        {/* Subhead */}
        <p className="animate-slide-up opacity-0 [animation-delay:200ms] text-lg md:text-xl text-brand-secondary mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed text-balance font-medium tracking-tight px-4 opacity-80">
          100% free. Open source. Built for teams who care about craft and detail.
        </p>

        {/* CTAs - Removed overriding shadow classes */}
        <div className="animate-slide-up opacity-0 [animation-delay:300ms] flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-12 px-6">
          <Button
            size="lg"
            className="w-full sm:w-auto h-14 px-10 transition-all active:scale-95 text-[15px]"
            onClick={() => window.open("https://github.com/Vrun-design/FlowMind", "_blank")}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Fork on GitHub
          </Button>
          <Button
            variant="secondary"
            size="lg"
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
            className="w-full sm:w-auto h-14 px-10 transition-all active:scale-95 text-[15px]"
            onClick={onLaunch}
          >
            Get Started
          </Button>
        </div>
        {/* Install Block */}
        <div className="animate-slide-up opacity-0 [animation-delay:400ms] group cursor-pointer w-full max-w-sm mx-auto">
          <div className="relative flex items-center justify-between md:justify-center gap-3 px-5 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-brand-border/60 hover:border-brand-primary/20 transition-all shadow-sm ring-1 ring-transparent hover:ring-brand-primary/10">
            <span className="font-mono text-xs md:text-sm text-brand-secondary select-all truncate">npm install @openflowkit/engine</span>
            <div className="hidden md:block w-px h-4 bg-brand-secondary/20"></div>
            <Copy className="w-3.5 h-3.5 text-brand-muted hover:text-brand-primary transition-colors shrink-0" />
          </div>
          <div className="mt-4 text-[10px] font-mono text-brand-muted uppercase tracking-widest opacity-60 flex items-center justify-center gap-3">
            <span>MIT Licensed</span>
            <span className="w-1 h-1 rounded-full bg-brand-muted/30"></span>
            <span>Local First</span>
            <span className="w-1 h-1 rounded-full bg-brand-muted/30"></span>
            <span>No Auth</span>
          </div>
        </div>
      </div>
    </section>
  );
}