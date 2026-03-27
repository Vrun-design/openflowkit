import React, { useEffect, useState } from 'react';
import { ArchitectureExploded } from './ArchitectureExploded';
import { APP_URL } from './constants';
import { FinalCTASection } from './FinalCTASection';
import { FigmaSection } from './FigmaSection';
import { Footer } from './Footer';
import { HeroSection } from './HeroSection';
import { Navbar } from './Navbar';
import { PricingSection } from './PricingSection';
import { ProblemSection } from './ProblemSection';
import { SolutionSection } from './SolutionSection';
import { Testimonials } from './Testimonials';
import { UseCases } from './UseCases';

export function LandingPage(): React.ReactElement {
  const [isScrolled, setIsScrolled] = useState(false);
  const sectionBackgroundClassName =
    'relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_35%,#f4f7fb_100%)]';

  useEffect(() => {
    function handleScroll(): void {
      setIsScrolled(window.scrollY > 20);
    }

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleLaunch(): void {
    window.open(APP_URL, '_blank');
  }

  return (
    <div className="min-h-screen bg-brand-canvas">
      <Navbar isScrolled={isScrolled} onLaunch={handleLaunch} />
      <HeroSection onLaunch={handleLaunch} />
      <ProblemSection />

      <div className={sectionBackgroundClassName}>
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(233,84,32,0.08),transparent_65%)] pointer-events-none" />
        <SolutionSection />
        <UseCases />
        <FigmaSection />
      </div>

      <ArchitectureExploded />
      <PricingSection onLaunch={handleLaunch} />
      <Testimonials />
      <FinalCTASection onLaunch={handleLaunch} />
      <Footer onLaunch={handleLaunch} />
    </div>
  );
}
