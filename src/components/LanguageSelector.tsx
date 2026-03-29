import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useVisualSettingsActions } from '@/store/viewHooks';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  scope: 'full' | 'ui';
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '/flags/us.svg', scope: 'full' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '/flags/tr.svg', scope: 'full' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '/flags/de.svg', scope: 'ui' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '/flags/fr.svg', scope: 'ui' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '/flags/es.svg', scope: 'ui' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '/flags/cn.svg', scope: 'ui' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '/flags/jp.svg', scope: 'ui' },
];

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'minimal';
  placement?: 'top' | 'bottom';
}

// --- Shared dropdown list (rendered by all 3 variants) ---
interface LanguageDropdownProps {
  isOpen: boolean;
  placement: 'top' | 'bottom';
  currentCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  width?: string;
}

function LanguageDropdown({
  isOpen,
  placement,
  currentCode,
  onSelect,
  onClose,
  width = 'w-60', // Widened to accommodate badges
}: LanguageDropdownProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const positionClass = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const originClass = placement === 'top' ? 'origin-bottom-right' : 'origin-top-right';

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-label="Close language selector"
      />
      <div
        className={`absolute right-0 ${positionClass} ${width} rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)]/95 p-1 shadow-[var(--shadow-md)] ring-1 ring-black/5 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-200 ${originClass}`}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all ${currentCode === lang.code
              ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
              : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]'
              }`}
          >
            <div className="flex items-center gap-2">
              <img src={lang.flag} alt={lang.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-[var(--color-brand-border)] shadow-sm" />
              <span>{lang.nativeName}</span>
            </div>
            {currentCode === lang.code && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </>
  );
}

// --- Main component ---
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'default',
  placement = 'bottom',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const { setViewSettings } = useVisualSettingsActions();

  const currentLanguage = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  async function changeLanguage(code: string): Promise<void> {
    await i18n.changeLanguage(code);
    setViewSettings({ language: code });

    setIsOpen(false);
  }

  const chevronClass = `transition-transform ${isOpen
    ? placement === 'top' ? '' : 'rotate-180'
    : placement === 'top' ? 'rotate-180' : ''
    }`;

  if (variant === 'compact') {
    return (
      <div className="relative w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-text)] transition-all hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
        >
          <div className="flex items-center gap-2">
            <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-[var(--color-brand-border)] shadow-sm" />
            <span>{currentLanguage.nativeName}</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-[var(--brand-secondary)] ${chevronClass}`} />
        </button>
        <LanguageDropdown
          isOpen={isOpen}
          placement={placement}
          currentCode={i18n.language}
          onSelect={changeLanguage}
          onClose={() => setIsOpen(false)}
          width="w-full"
        />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-transparent px-2 py-1.5 text-sm font-medium text-[var(--brand-secondary)] transition-all hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
        >
          <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-[var(--color-brand-border)] shadow-sm" />
          <ChevronDown className={`h-3 w-3 text-[var(--brand-secondary)] ${chevronClass}`} />
        </button>
        <LanguageDropdown
          isOpen={isOpen}
          placement={placement}
          currentCode={i18n.language}
          onSelect={changeLanguage}
          onClose={() => setIsOpen(false)}
          width="w-56"
        />
      </div>
    );
  }

  // Default variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-secondary)] transition-all shadow-sm hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)] hover:shadow"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">
          <img src={currentLanguage.flag} alt={currentLanguage.name} className="mr-1.5 inline h-3.5 w-5 rounded-[2px] border border-[var(--color-brand-border)] object-cover shadow-sm" />
          {currentLanguage.nativeName}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--brand-secondary)] ${chevronClass}`} />
      </button>
      <LanguageDropdown
        isOpen={isOpen}
        placement={placement}
        currentCode={i18n.language}
        onSelect={changeLanguage}
        onClose={() => setIsOpen(false)}
        width="w-48"
      />
    </div>
  );
};
