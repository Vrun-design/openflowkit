import React from 'react';
import { Github, Star } from 'lucide-react';
import { useGithubStars } from '@/hooks/useGithubStars';

const GITHUB_REPOSITORY_URL = 'https://github.com/Vrun-design/openflowkit';

const cardClassName = [
  'group relative flex h-[36px] w-full items-center justify-between rounded-[8px]',
  'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-[var(--brand-primary)] active:scale-[0.98]',
  'bg-[linear-gradient(180deg,#ffffff_0%,#f9fafb_100%)] border border-[rgba(0,0,0,0.08)]',
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]',
  'hover:-translate-y-[0.5px] hover:border-[rgba(0,0,0,0.12)]',
  'hover:shadow-[0_3px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]',
  'dark:bg-[linear-gradient(180deg,#1c1c1e_0%,#111113_100%)]',
  'dark:border-[rgba(255,255,255,0.08)]',
  'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.4)]',
  'dark:hover:border-[rgba(255,255,255,0.12)]',
  'dark:hover:bg-[linear-gradient(180deg,#242427_0%,#18181b_100%)]',
  'dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.5)]',
].join(' ');

export function GithubCard(): React.ReactElement {
  const stars = useGithubStars();

  return (
    <div className="px-3 pb-3">
      <a
        href={GITHUB_REPOSITORY_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="sidebar-github-link"
        className={cardClassName}
      >
        <div className="relative z-10 flex items-center gap-2.5 pl-2.5">
          <Github
            className="h-[15px] w-[15px] text-[#52525B] transition-colors duration-150 group-hover:text-[#18181B] dark:text-[#A1A1AA] dark:group-hover:text-white"
            strokeWidth={2}
          />
          <span className="text-[13px] font-medium tracking-[0.01em] text-[#27272A] transition-colors duration-150 group-hover:text-black dark:text-[#D4D4D8] dark:group-hover:text-white">
            Star on GitHub
          </span>
        </div>

        {stars !== null && (
          <div className="relative z-10 flex h-[22px] items-center gap-1.5 border-l border-[rgba(0,0,0,0.08)] pl-2.5 pr-2.5 transition-colors duration-150 group-hover:border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.08)] dark:group-hover:border-[rgba(255,255,255,0.15)]">
            <span className="font-mono text-[11px] font-semibold tracking-wide text-[#71717A] transition-colors duration-150 group-hover:text-[#18181B] dark:text-[#A1A1AA] dark:group-hover:text-white">
              {stars.toLocaleString()}
            </span>
            <Star
              className="h-[12px] w-[12px] text-[#A1A1AA] opacity-70 transition-all duration-300 group-hover:scale-[1.15] group-hover:text-amber-500 group-hover:fill-amber-500 group-hover:opacity-100 dark:text-[#71717A] dark:group-hover:text-amber-400 dark:group-hover:fill-amber-400"
              strokeWidth={2.5}
            />
          </div>
        )}
      </a>
    </div>
  );
}
