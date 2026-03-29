import React, { useEffect, useState } from 'react';
import { ChevronRight, Github, Menu, X } from 'lucide-react';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';
import { Button } from './Button';
import { GITHUB_REPO_URL, NAV_LINKS } from './constants';
import { useGithubStars } from './useGithubStars';

interface NavbarProps {
  isScrolled: boolean;
  onLaunch: () => void;
}

export function Navbar({ isScrolled, onLaunch }: NavbarProps): React.ReactElement {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const stars = useGithubStars();
  const navContainerClasses = getNavContainerClasses(isMobileMenuOpen, isScrolled);
  const mobileMenuClasses = isMobileMenuOpen
    ? 'opacity-100 pointer-events-auto translate-y-0'
    : 'opacity-0 pointer-events-none -translate-y-4';

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, id: string): void {
    event.preventDefault();
    const element = document.getElementById(id.replace('#', ''));

    if (element !== null) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function closeMobileMenu(): void {
    setIsMobileMenuOpen(false);
  }

  function toggleMobileMenu(): void {
    setIsMobileMenuOpen((previousValue) => !previousValue);
  }

  function handleMobileLaunch(): void {
    closeMobileMenu();
    onLaunch();
  }

  function handleMobileNavClick(event: React.MouseEvent<HTMLAnchorElement>, id: string): void {
    closeMobileMenu();
    handleNavClick(event, id);
  }

  function openGithub(): void {
    window.open(GITHUB_REPO_URL, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      {/* Main Navbar Pill */}
      <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-4 md:pt-6 px-4 transition-all duration-300">
        <nav
          className={`transition-all duration-500 w-full max-w-5xl rounded-full border ${navContainerClasses} py-2.5 px-4 md:px-5 relative flex items-center justify-between`}
        >
          {/* Logo */}
          <button
            type="button"
            onClick={onLaunch}
            data-analytics-event="landing_open_app_clicked"
            data-analytics-placement="navbar-logo"
            data-analytics-target="app"
            className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
            aria-label="Open OpenFlowKit"
          >
            <OpenFlowLogo className="h-8 w-8 shrink-0 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105" />
            <span className="text-lg font-bold tracking-tight text-brand-primary font-sans group-hover:opacity-80 transition-opacity whitespace-nowrap">
              OpenFlowKit
            </span>
          </button>

          {/* Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                className="text-[13px] font-medium text-brand-secondary hover:text-brand-primary transition-colors relative group tracking-wide"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 px-3 gap-1.5"
                onClick={openGithub}
                data-analytics-event="landing_github_clicked"
                data-analytics-placement="navbar"
                data-analytics-target="github"
              >
                <Github className="w-4 h-4 text-brand-secondary group-hover:text-brand-dark transition-colors" />
                <span className="font-medium text-[13px] text-brand-dark">Star</span>
                {stars !== null && (
                  <div className="flex items-center gap-1.5 pl-1.5 ml-0.5 border-l border-brand-border/60">
                    <span className="text-[12px] font-mono font-medium text-brand-secondary tracking-tight">
                      {stars.toLocaleString()}
                    </span>
                  </div>
                )}
              </Button>
            </div>

            <div className="hidden md:flex">
              <Button
                size="sm"
                variant="primary"
                className="px-5 text-[13px] h-9 transform hover:-translate-y-0.5 transition-all"
                onClick={onLaunch}
                data-analytics-event="landing_open_app_clicked"
                data-analytics-placement="navbar"
                data-analytics-target="app"
              >
                <span className="mr-1">Get Started</span>
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="md:hidden p-2 text-brand-primary hover:bg-black/5 rounded-full transition-colors active:scale-90"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-white z-[55] transition-all duration-500 md:hidden flex flex-col pt-24 px-6 overflow-y-auto ${mobileMenuClasses}`}
      >
        <div className="flex flex-col gap-2">
          {NAV_LINKS.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              onClick={(event) => handleMobileNavClick(event, item.href)}
              className="text-3xl font-bold text-brand-primary py-4 border-b border-brand-border/40 flex items-center justify-between group"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {item.name}
              <ChevronRight className="w-6 h-6 opacity-0 -translate-x-4 group-hover:translate-x-0 group-hover:opacity-100 transition-all text-brand-muted" />
            </a>
          ))}
          <div className="mt-12 space-y-4">
            <Button
              size="lg"
              className="h-14 w-full text-base shadow-none"
              onClick={handleMobileLaunch}
              data-analytics-event="landing_open_app_clicked"
              data-analytics-placement="mobile-menu"
              data-analytics-target="app"
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-14 w-full text-base"
              onClick={openGithub}
              data-analytics-event="landing_github_clicked"
              data-analytics-placement="mobile-menu"
              data-analytics-target="github"
            >
              View on GitHub
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function getNavContainerClasses(isMobileMenuOpen: boolean, isScrolled: boolean): string {
  if (isMobileMenuOpen) {
    return 'bg-white border-transparent shadow-none ring-0';
  }

  if (isScrolled) {
    return 'bg-white/85 backdrop-blur-xl shadow-lg shadow-black/[0.03] border-brand-border/80 ring-1 ring-black/5';
  }

  return 'bg-white/50 backdrop-blur-md border-brand-border/60 shadow-sm shadow-black/[0.02] ring-1 ring-white/50';
}
