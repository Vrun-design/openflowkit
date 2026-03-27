import React from 'react';
import { Github } from 'lucide-react';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { Button } from './Button';
import { GITHUB_REPO_URL } from './constants';
import { useGithubStars } from './useGithubStars';

interface FooterProps {
  onLaunch: () => void;
}

export function Footer({ onLaunch }: FooterProps): React.ReactElement {
  const stars = useGithubStars();

  function handleOpenGithub(): void {
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <footer className="bg-white border-t border-brand-border py-12 select-none">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand & Legal */}
          <div className="flex flex-col items-center md:items-start gap-2 md:w-1/3">
            <button
              type="button"
              onClick={onLaunch}
              className="flex items-center gap-2 cursor-pointer group"
              aria-label="Open OpenFlowKit"
            >
              <OpenFlowLogo className="h-6 w-6 transition-transform group-hover:scale-105" />
              <span className="font-bold text-brand-primary text-sm tracking-tight">
                OpenFlowKit
              </span>
            </button>
            <div className="flex items-center gap-2 text-xs text-brand-secondary font-medium mt-1">
              <span>MIT Licensed</span>
              <span className="w-1 h-1 rounded-full bg-brand-secondary/30" />
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Product Hunt Badge */}
          <div className="flex justify-center md:w-1/3">
            <a
              href="https://www.producthunt.com/products/openflowkit?embed=true&utm_source=badge-top-post-topic-badge&utm_medium=badge&utm_campaign=badge-openflowkit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-90 transition-opacity transform hover:scale-105 duration-300"
            >
              <img
                alt="Product Hunt"
                width="224"
                height="48"
                src="https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=1081019&theme=light&period=weekly&topic_id=44&t=1772031326630"
                className="h-11 w-auto rounded border border-gray-100 shadow-sm"
              />
            </a>
          </div>

          {/* GitHub Stars */}
          <div className="flex items-center justify-center md:justify-end md:w-1/3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              shape="pill"
              onClick={handleOpenGithub}
              className="group h-12 gap-3 px-5"
              aria-label="OpenFlowKit on GitHub"
            >
              <Github className="w-5 h-5 text-brand-primary group-hover:rotate-12 transition-transform" />
              <div className="flex items-center gap-2 border-l border-brand-border pl-3">
                <span className="text-sm font-semibold">Star us</span>
                {stars !== null && (
                  <span className="rounded-full bg-brand-canvas px-2.5 py-0.5 text-sm font-mono font-bold tracking-tight text-brand-secondary ring-1 ring-brand-border/80">
                    {stars.toLocaleString()}
                  </span>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
