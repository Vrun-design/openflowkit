import React from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '../ui/Switch';
import { Globe, Moon, Sun, Zap } from 'lucide-react';
import { useAnalyticsPreference } from '@/hooks/useAnalyticsPreference';
import { useTheme } from '@/context/ThemeContext';
import { LanguageSelector } from '@/components/LanguageSelector';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  icon: React.ReactNode;
  label: string;
};

export function GeneralSettings(): React.ReactElement {
  const { t } = useTranslation();
  const [analyticsEnabled, setAnalyticsEnabled] = useAnalyticsPreference();
  const { theme, setTheme } = useTheme();
  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      icon: <Sun className="w-4 h-4" />,
      label: t('settings.themeLight', 'Light'),
    },
    {
      value: 'dark',
      icon: <Moon className="w-4 h-4" />,
      label: t('settings.themeDark', 'Dark'),
    },
    {
      value: 'system',
      icon: (
        <>
          <Sun className="w-3 h-3" />
          <Moon className="w-3 h-3" />
        </>
      ),
      label: t('settings.themeSystem', 'System'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--brand-text)] mb-3">
          {t('settings.analytics', 'Analytics')}
        </h3>
        <div className="space-y-2">
          <SettingRow
            icon={<Zap className="w-4 h-4" />}
            label={t('settingsModal.analytics.enableTitle', 'Anonymous Launch Analytics')}
            description={t(
              'settingsModal.analytics.enableDescription',
              'Track coarse product events and reliability issues only. We do not send diagram content, prompts, file contents, or API keys.'
            )}
            checked={analyticsEnabled}
            onChange={setAnalyticsEnabled}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--brand-text)] mb-3">
          {t('settings.appearance', 'Appearance')}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] border text-xs font-semibold transition-colors ${
                theme === option.value
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                  : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-text)]'
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--brand-text)] mb-3">
          {t('settings.language', 'Language')}
        </h3>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)]">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--brand-text)]">
                {t('settings.selectLanguage', 'Select Language')}
              </p>
              <p className="text-[11px] text-[var(--brand-secondary)]">
                {t(
                  'settings.languageDescription',
                  'Choose the interface language used across the app.'
                )}
              </p>
            </div>
          </div>
          <LanguageSelector variant="compact" />
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3 transition-colors hover:border-[var(--brand-primary)]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)]">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--brand-text)]">{label}</p>
          <p className="text-[11px] text-[var(--brand-secondary)]">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
