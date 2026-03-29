import React, { useEffect, useState } from 'react';
import { ArchitectureExploded } from './ArchitectureExploded';
import { APP_URL } from './constants';
import { AnimationExportSection } from './AnimationExportSection';
import { CodeImportSection } from './CodeImportSection';
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

const LIGHT_SECTION_CLASS_NAME =
  'relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_35%,#f4f7fb_100%)]';

export function LandingPage(): React.ReactElement {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll(): void {
      setIsScrolled(window.scrollY > 20);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function openApp(): void {
    window.open(APP_URL, '_blank');
  }

  return (
    <div className="min-h-screen bg-brand-canvas">
      <Navbar isScrolled={isScrolled} onLaunch={openApp} />
      <HeroSection onLaunch={openApp} />
      <ProblemSection />
      <CodeImportSection />
      <AnimationExportSection />
      <div className={LIGHT_SECTION_CLASS_NAME}>
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(233,84,32,0.08),transparent_65%)] pointer-events-none" />
        <SolutionSection />
        <UseCases />
        <FigmaSection />
      </div>
      <ArchitectureExploded />
      <PricingSection onLaunch={openApp} />
      <Testimonials />
      <FinalCTASection onLaunch={openApp} />
      <Footer onLaunch={openApp} />
    </div>
  );
}
