import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const { t } = useTranslation();
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
        className={`absolute right-0 ${positionClass} ${width} bg-white/95 backdrop-blur-xl rounded-lg shadow-xl border border-slate-200 ring-1 ring-black/5 p-1 z-50 animate-in fade-in zoom-in-95 duration-200 ${originClass}`}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={`flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium transition-all ${currentCode === lang.code
              ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <div className="flex items-center gap-2">
              <img src={lang.flag} alt={lang.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-slate-200 shadow-sm" />
              <span className="flex items-center gap-2">
                {lang.nativeName}
                {lang.scope === 'ui' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 uppercase tracking-wider">
                    UI Only
                  </span>
                )}
              </span>
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
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  const currentLanguage = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  async function changeLanguage(code: string): Promise<void> {
    await i18n.changeLanguage(code);
    setViewSettings({ language: code });

    if (location.pathname.startsWith('/docs') && slug) {
      navigate(`/docs/${code}/${slug}`, { replace: true });
    }

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
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-slate-200 transition-all text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        >
          <div className="flex items-center gap-2">
            <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-slate-200 shadow-sm" />
            <span>{currentLanguage.nativeName}</span>
          </div>
          <ChevronDown className={`w-4 h-4 ${chevronClass}`} />
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
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all text-sm font-medium bg-transparent text-slate-600 hover:bg-slate-100"
          title="Change Language"
        >
          <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-3.5 object-cover rounded-[2px] border border-slate-200 shadow-sm" />
          <ChevronDown className={`w-3 h-3 ${chevronClass}`} />
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
        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border transition-all text-sm font-medium bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm hover:shadow"
        title="Change Language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">
          <img src={currentLanguage.flag} alt={currentLanguage.name} className="inline w-5 h-3.5 object-cover rounded-[2px] border border-slate-200 shadow-sm mr-1.5" />
          {currentLanguage.nativeName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ${chevronClass}`} />
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
