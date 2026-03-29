import React, { useEffect, useState } from 'react';
import { GitBranch, Play } from 'lucide-react';
import { Button } from './Button';
import { GITHUB_REPO_URL } from './constants';

const ROTATING_WORDS = ['thinks', 'draws', 'builds', 'ships'] as const;
const EXIT_DURATION_MS = 500;
const WORD_ROTATION_INTERVAL_MS = 3000;

interface HeroSectionProps {
  onLaunch: () => void;
}

export function HeroSection({ onLaunch }: HeroSectionProps): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const currentWord = ROTATING_WORDS[index];
  const wordAnimationClass = isExiting
    ? '[animation:text-exit_0.5s_ease-in_forwards]'
    : '[animation:text-reveal_0.5s_ease-out_forwards]';

  useEffect(() => {
    let exitTimer: number | undefined;

    const interval = window.setInterval(() => {
      setIsExiting(true);

      exitTimer = window.setTimeout(() => {
        setIndex((previousIndex) => (previousIndex + 1) % ROTATING_WORDS.length);
        setIsExiting(false);
      }, EXIT_DURATION_MS);
    }, WORD_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);

      if (exitTimer !== undefined) {
        window.clearTimeout(exitTimer);
      }
    };
  }, []);

  function openGithub(): void {
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="relative pt-32 pb-16 md:pt-44 md:pb-32 overflow-hidden select-none bg-[#FAFAFA]">
      {/* Premium Multi-Layered Mesh Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#fff_0%,transparent_100%)] z-0"></div>

        {/* Crisp Developer Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)] z-0"></div>

        {/* Ethereal Glows */}
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-brand-blue/[0.03] rounded-full blur-[100px] animate-pulse-slow mix-blend-multiply z-0"></div>
        <div className="absolute top-[10%] right-[10%] w-[40vw] h-[40vw] bg-purple-500/[0.03] rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s] mix-blend-multiply z-0"></div>
        <div className="absolute bottom-[20%] left-[30%] w-[60vw] h-[60vw] bg-indigo-500/[0.02] rounded-full blur-[120px] animate-pulse-slow [animation-delay:4s] mix-blend-multiply z-0"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="animate-slide-up opacity-0 [animation-delay:0ms] inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary/60 mb-6 font-mono text-[10px] uppercase tracking-widest font-bold ring-1 ring-brand-primary/5">
          <span>100% Free & Open Source</span>
        </div>

        {/* Razor-Sharp Headline */}
        <h1 className="animate-slide-up opacity-0 [animation-delay:100ms] text-5xl sm:text-6xl md:text-[88px] font-bold tracking-[-0.04em] text-brand-dark mb-6 md:mb-8 max-w-[1000px] mx-auto leading-[1.05] text-balance">
          The diagram studio <br />
          <span className="font-serif italic font-normal text-brand-primary inline-flex flex-wrap justify-center items-center gap-[0.2em]">
            that
            <span
              key={currentWord}
              className={`inline-block ${wordAnimationClass}`}
            >
              {currentWord}
            </span>
            like you.
          </span>
        </h1>

        {/* Polished Subhead */}
        <p className="animate-slide-up opacity-0 [animation-delay:200ms] text-lg md:text-xl text-gray-500 mb-10 md:mb-12 max-w-2xl mx-auto leading-relaxed text-balance font-medium tracking-tight">
          100% free, open-source diagram tool for builders. Write code or drag and drop — get
          beautiful results either way.
        </p>

        {/* CTAs */}
        <div className="animate-slide-up opacity-0 [animation-delay:300ms] flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-12 px-6">
          <Button
            size="lg"
            className="w-full sm:w-auto h-14 px-10 transition-all active:scale-95 text-[15px]"
            onClick={onLaunch}
            data-analytics-event="landing_open_app_clicked"
            data-analytics-placement="hero-primary"
            data-analytics-target="app"
          >
            Get Started
            <Play className="w-3.5 h-3.5 fill-current ml-2" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto h-14 px-10 transition-all active:scale-95 text-[15px]"
            onClick={openGithub}
            data-analytics-event="landing_github_clicked"
            data-analytics-placement="hero-secondary"
            data-analytics-target="github"
          >
            <GitBranch className="w-4 h-4 mr-2" />
            Fork on GitHub
          </Button>
        </div>

        {/* Minimalist Trust Block */}
        <div className="animate-slide-up opacity-0 [animation-delay:400ms] w-full max-w-3xl mx-auto pt-10 border-t border-gray-200/60">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-6">
            Built for developer workflows
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span className="text-sm font-medium tracking-tight">100% Free Open Source</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              <span className="text-sm font-medium tracking-tight">MIT Licensed</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm font-medium tracking-tight">Privacy-First</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" x2="22" y1="12" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="text-sm font-medium tracking-tight">Local-First Storage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
