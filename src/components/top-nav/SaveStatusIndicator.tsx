import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../Tooltip';

interface SaveStatusIndicatorProps {
  showPrivacyMessage?: boolean;
}

function getTooltipText(
  t: ReturnType<typeof useTranslation>['t'],
  time: string,
  showPrivacyMessage: boolean
): string {
  const messages = [
    t('nav.autoSaved', {
      defaultValue: 'Saved locally at {{time}}.',
      time,
    }),
  ];

  if (showPrivacyMessage) {
    messages.push(
      t('nav.privacyShort', {
        defaultValue: 'Your diagrams stay on this device and do not reach our servers.',
      })
    );
  }

  return messages.join('\n');
}

export function SaveStatusIndicator({
  showPrivacyMessage = true,
}: SaveStatusIndicatorProps): React.ReactElement {
  const { t } = useTranslation();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    function updateTime(): void {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    updateTime();

    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const tooltipText = getTooltipText(t, time, showPrivacyMessage);
  const ariaLabel = t('nav.saveStatus', {
    defaultValue: 'Local save status',
  });

  return (
    <Tooltip
      text={tooltipText}
      side="bottom"
      contentClassName="max-w-[260px] whitespace-pre-line text-center leading-snug sm:max-w-[320px]"
    >
      <div
        aria-label={ariaLabel}
        className="flex cursor-default items-center justify-center rounded-md p-1.5 text-[var(--brand-primary)] transition-colors duration-300 animate-in fade-in zoom-in-50 hover:bg-[var(--brand-surface)]"
      >
        <ShieldCheck
          className="h-[18px] w-[18px] drop-shadow-sm text-white"
          fill="var(--brand-primary)"
        />
      </div>
    </Tooltip>
  );
}
