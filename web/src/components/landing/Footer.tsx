import React from 'react';
import { Github } from 'lucide-react';
import { OpenFlowLogo } from '../icons/OpenFlowLogo';

interface FooterProps {
  onLaunch: () => void;
}

const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#architecture' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  developers: [
    { label: 'GitHub', href: 'https://github.com/Vrun-design/openflowkit', external: true },
    { label: 'DSL Manual', href: 'https://docs.openflowkit.com', external: true },
    { label: 'Contributing', href: 'https://github.com/Vrun-design/openflowkit/blob/main/CONTRIBUTING.md', external: true },
    { label: 'Architecture', href: 'https://github.com/Vrun-design/openflowkit/blob/main/ARCHITECTURE.md', external: true },
  ],
  resources: [
    { label: 'Documentation', href: 'https://docs.openflowkit.com', external: true },
    { label: 'Changelog', href: 'https://docs.openflowkit.com/changelog', external: true },
    { label: 'Templates', href: '#', external: false },
  ],
  legal: [
    { label: 'License (MIT)', href: 'https://github.com/Vrun-design/openflowkit/blob/main/LICENSE', external: true },
    { label: 'Security', href: 'https://github.com/Vrun-design/openflowkit/blob/main/SECURITY.md', external: true },
    { label: 'Code of Conduct', href: 'https://github.com/Vrun-design/openflowkit/blob/main/CODE_OF_CONDUCT.md', external: true },
  ],
};

export function Footer({ onLaunch }: FooterProps): React.ReactElement {
  const renderLinks = (links: { label: string; href: string; external?: boolean }[]) => (
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="text-sm text-brand-secondary hover:text-brand-primary transition-colors"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <footer className="bg-white border-t border-brand-border pt-16 pb-8 select-none">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <button
              type="button"
              onClick={onLaunch}
              className="flex items-center gap-2 cursor-pointer group mb-4"
              aria-label="Open OpenFlowKit"
            >
              <div className="w-6 h-6 bg-brand-primary rounded flex items-center justify-center text-white shadow-sm transition-transform group-hover:rotate-6">
                <OpenFlowLogo className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-brand-primary text-sm tracking-tight">OpenFlowKit</span>
            </button>
            <p className="text-xs text-brand-secondary leading-relaxed mb-4 max-w-[200px]">
              The free, open-source diagramming tool with AI generation built in.
            </p>
            <a
              href="https://www.producthunt.com/products/openflowkit?embed=true&utm_source=badge-top-post-topic-badge&utm_medium=badge&utm_campaign=badge-openflowkit"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block hover:opacity-90 transition-opacity"
            >
              <img
                alt="Product Hunt"
                width="180"
                height="39"
                src="https://api.producthunt.com/widgets/embed-image/v1/top-post-topic-badge.svg?post_id=1081019&theme=light&period=weekly&topic_id=44&t=1772031326630"
                className="h-7 w-auto"
              />
            </a>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-4">Product</h4>
            {renderLinks(FOOTER_LINKS.product)}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-4">Developers</h4>
            {renderLinks(FOOTER_LINKS.developers)}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-4">Resources</h4>
            {renderLinks(FOOTER_LINKS.resources)}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-dark mb-4">Legal</h4>
            {renderLinks(FOOTER_LINKS.legal)}
          </div>
        </div>

        <div className="pt-6 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-brand-secondary">
            <span>MIT Licensed</span>
            <span className="w-1 h-1 rounded-full bg-brand-secondary/30" />
            <span>© {new Date().getFullYear()} OpenFlowKit</span>
          </div>
          <a
            href="https://github.com/Vrun-design/openflowkit"
            target="_blank"
            rel="noreferrer"
            className="text-brand-secondary hover:text-brand-primary transition-colors group"
            aria-label="GitHub"
          >
            <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}
