import type React from 'react';
import { Cookie, Layout, Lock } from 'lucide-react';
import type { ThemeColors } from '@/theme';
import {
  surface,
  background,
  border,
  borderSoft,
  text,
  textSoft,
  textMuted,
} from './variantConstants';

interface BrowserVariantRendererParams {
  imageUrl?: string;
  variant?: string;
  label?: string;
  style: ThemeColors;
  lockIconVisible: boolean;
  imageAlt: string;
}

export function renderBrowserVariantContent({
  imageUrl,
  variant,
  label,
  style,
  lockIconVisible,
  imageAlt,
}: BrowserVariantRendererParams): React.ReactElement {
  if (imageUrl) {
    return <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover object-top" />;
  }

  switch (variant) {
    case 'landing':
      return (
        <div className={`flex h-full flex-col ${surface}`}>
          <div
            className={`flex flex-1 flex-col items-center justify-center space-y-3 p-6 ${style.iconBg} bg-opacity-10`}
          >
            <div className="space-y-2 text-center">
              <div className={`mx-auto h-4 w-32 rounded-lg ${text} opacity-80`} />
              <div className={`mx-auto h-2 w-48 rounded-md ${textSoft} opacity-60`} />
            </div>
            <div className="mt-4 flex gap-2">
              <div className={`h-6 w-16 rounded-md shadow-sm ${style.bg}`} />
              <div className={`h-6 w-16 rounded-md border ${border} ${surface}`} />
            </div>
          </div>
          <div className={`grid h-1/3 grid-cols-3 divide-x ${borderSoft} border-t ${borderSoft}`}>
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex flex-col items-center justify-center space-y-2 p-3">
                <div className={`mb-1 h-8 w-8 rounded-full ${style.iconBg}`} />
                <div className={`h-1.5 w-12 rounded-sm ${textMuted}`} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className={`flex h-full ${background}`}>
          <div
            className={`flex w-12 flex-col items-center space-y-3 border-r ${border} ${surface} py-3`}
          >
            <div className={`h-6 w-6 rounded-md ${style.bg}`} />
            <div className={`h-0.5 w-4 ${textMuted}`} />
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className={`h-6 w-6 rounded-md ${background}`} />
            ))}
          </div>
          <div className="flex flex-1 flex-col">
            <div
              className={`flex h-10 items-center justify-between border-b ${border} ${surface} px-4`}
            >
              <div className={`h-2 w-24 rounded-sm ${textMuted}`} />
              <div className={`h-6 w-6 rounded-full ${textMuted}`} />
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
              <div className={`space-y-2 rounded-lg border ${border} ${surface} p-2 shadow-sm`}>
                <div className={`h-2 w-8 rounded-sm ${textMuted}`} />
                <div
                  className={`flex h-16 w-full items-end justify-center gap-1 rounded-md px-2 pb-1 ${style.iconBg} bg-opacity-20`}
                >
                  <div className={`h-6 w-2 opacity-40 ${style.bg}`} />
                  <div className={`h-10 w-2 opacity-60 ${style.bg}`} />
                  <div className={`h-8 w-2 opacity-50 ${style.bg}`} />
                  <div className={`h-12 w-2 ${style.bg}`} />
                </div>
              </div>
              <div className={`space-y-2 rounded-lg border ${border} ${surface} p-2 shadow-sm`}>
                <div className={`h-2 w-12 rounded-sm ${textMuted}`} />
                <div className="space-y-1.5">
                  <div className={`h-1.5 w-full rounded-sm ${background}`} />
                  <div className={`h-1.5 w-3/4 rounded-sm ${background}`} />
                  <div className={`h-1.5 w-full rounded-sm ${background}`} />
                </div>
              </div>
              <div
                className={`col-span-2 flex items-center gap-3 rounded-lg border ${border} ${surface} p-2 shadow-sm`}
              >
                <div className={`h-2 flex-1 rounded-sm ${background}`} />
                <div className={`h-2 flex-1 rounded-sm ${background}`} />
              </div>
            </div>
          </div>
        </div>
      );

    case 'form':
      return (
        <div className={`flex h-full items-center justify-center ${style.iconBg} bg-opacity-5`}>
          <div className={`w-3/5 space-y-3 rounded-lg border ${border} ${surface} p-4 shadow-sm`}>
            <div className="mb-2 space-y-1 text-center">
              <div className={`mx-auto h-2.5 w-1/2 rounded-sm ${text}`} />
              <div className={`mx-auto h-1.5 w-3/4 rounded-sm ${textSoft}`} />
            </div>
            <div className="space-y-2">
              <div className={`h-6 w-full rounded border ${border} ${background}`} />
              <div className={`h-6 w-full rounded border ${border} ${background}`} />
            </div>
            <div className={`mt-1 h-6 w-full rounded shadow-sm ${style.bg}`} />
          </div>
        </div>
      );

    case 'cookie':
      return (
        <div className={`relative flex h-full flex-col ${background}`}>
          <div className="flex flex-1 flex-col items-center space-y-4 p-4 opacity-50">
            <div className={`h-32 w-3/4 rounded-lg border ${border} ${surface} shadow-sm`} />
            <div className={`h-4 w-full rounded-sm ${textMuted}`} />
            <div className={`h-4 w-2/3 rounded-sm ${textMuted}`} />
          </div>
          <div className="absolute inset-0 z-10 bg-slate-900/10" />
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 border-t ${surface} p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] ${style.border}`}
          >
            <div className="flex items-start gap-3">
              <Cookie className={`mt-1 h-6 w-6 shrink-0 ${style.text}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-2.5 w-32 rounded-sm ${text}`} />
                <div className="space-y-1.5">
                  <div className={`h-1.5 w-full rounded-sm ${textSoft}`} />
                  <div className={`h-1.5 w-4/5 rounded-sm ${textSoft}`} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 pl-9">
              <div className={`h-7 w-20 rounded-md ${text} shadow-sm`} />
              <div className={`h-7 w-20 rounded-md border ${surface} ${style.border}`} />
            </div>
          </div>
        </div>
      );

    case 'pricing':
      return (
        <div className={`flex h-full flex-col ${background}`}>
          <div
            className={`flex h-16 flex-col items-center justify-center space-y-1.5 border-b ${borderSoft} ${surface}`}
          >
            <div className={`h-2.5 w-32 rounded-sm ${text}`} />
            <div className={`h-1.5 w-48 rounded-sm ${textSoft}`} />
          </div>
          <div className="grid flex-1 grid-cols-3 items-center gap-3 p-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`relative flex h-full flex-col overflow-hidden rounded-lg border ${surface} p-2 shadow-sm ${item === 2 ? style.border : border}`}
              >
                {item === 2 ? <div className={`absolute inset-x-0 top-0 h-1 ${style.bg}`} /> : null}
                <div className="mb-3 flex flex-col items-center space-y-1.5 pt-2 text-center">
                  <div className={`h-2 w-8 rounded-sm ${textSoft}`} />
                  <div className={`h-4 w-12 rounded-sm ${text}`} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className={`h-1 w-full rounded-sm ${background}`} />
                  <div className={`h-1 w-full rounded-sm ${background}`} />
                  <div className={`h-1 w-2/3 rounded-sm ${background}`} />
                </div>
                <div
                  className={`mt-3 h-5 w-full rounded-sm ${item === 2 ? style.bg : 'bg-[var(--brand-background)]'}`}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case 'analytics':
      return (
        <div className="flex h-full flex-col bg-slate-950 text-white">
          <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-2">
                <div className="h-2 w-10 rounded-sm bg-white/30" />
                <div className={`mt-2 h-5 w-14 rounded-sm ${style.bg}`} />
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-[1.5fr_1fr] gap-3 p-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-3 h-2 w-24 rounded-sm bg-white/20" />
              <div className="flex h-[calc(100%-20px)] items-end gap-2">
                {[28, 56, 44, 72, 64, 88].map((height) => (
                  <div key={height} className={`w-full rounded-t ${style.bg}`} style={{ height }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="h-2 w-12 rounded-sm bg-white/20" />
                  <div className="mt-2 h-8 rounded-md bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'settings':
      return (
        <div className={`grid h-full grid-cols-[88px_1fr] ${background}`}>
          <div className={`space-y-2 border-r ${border} ${surface} p-3`}>
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className={`h-8 rounded-md ${item === 2 ? style.iconBg : 'bg-[var(--brand-background)]'}`}
              />
            ))}
          </div>
          <div className="space-y-3 p-4">
            <div className={`h-3 w-32 rounded-sm ${text}`} />
            {[1, 2, 3].map((item) => (
              <div key={item} className={`rounded-xl border ${border} ${surface} p-3 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className={`h-2.5 w-24 rounded-sm ${textSoft}`} />
                    <div className={`h-1.5 w-40 rounded-sm ${textMuted}`} />
                  </div>
                  <div
                    className={`h-6 w-10 rounded-full ${item === 1 ? style.bg : 'bg-[var(--brand-background)]'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'docs':
      return (
        <div className={`grid h-full grid-cols-[72px_1fr] ${surface}`}>
          <div className={`space-y-2 border-r ${borderSoft} ${background} p-3`}>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className={`h-2 rounded-sm ${textMuted}`} />
            ))}
          </div>
          <div className="space-y-3 p-4">
            <div className={`h-4 w-40 rounded-sm ${text}`} />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className={`h-2 rounded-sm ${item === 3 ? 'w-2/3' : 'w-full'} ${textMuted}`}
                />
              ))}
            </div>
            <div className={`rounded-xl border ${border} bg-slate-950 p-3`}>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className={`h-2 rounded-sm ${item === 4 ? 'w-1/2' : 'w-full'} bg-emerald-300/30`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'checkout':
      return (
        <div className={`grid h-full grid-cols-[1.2fr_0.9fr] ${background}`}>
          <div className="space-y-3 p-4">
            <div className={`h-3 w-32 rounded-sm ${text}`} />
            {[1, 2, 3].map((item) => (
              <div key={item} className={`rounded-xl border ${border} ${surface} p-3 shadow-sm`}>
                <div className={`h-2 w-20 rounded-sm ${textSoft}`} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className={`h-8 rounded-md ${background}`} />
                  <div className={`h-8 rounded-md ${background}`} />
                </div>
              </div>
            ))}
          </div>
          <div className={`border-l ${border} ${surface} p-4`}>
            <div className={`h-3 w-24 rounded-sm ${textSoft}`} />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className={`h-2 w-16 rounded-sm ${textSoft}`} />
                    <div className={`h-1.5 w-10 rounded-sm ${textMuted}`} />
                  </div>
                  <div className={`h-2 w-8 rounded-sm ${textSoft}`} />
                </div>
              ))}
            </div>
            <div className={`mt-6 h-10 rounded-lg ${style.bg}`} />
          </div>
        </div>
      );

    case 'kanban':
      return (
        <div className={`grid h-full grid-cols-3 gap-3 ${background} p-3`}>
          {['Backlog', 'In Progress', 'Done'].map((column, index) => (
            <div key={column} className={`rounded-xl border ${border} ${surface} p-2 shadow-sm`}>
              <div className="mb-2 flex items-center justify-between">
                <div className={`h-2.5 w-16 rounded-sm ${textSoft}`} />
                <div
                  className={`h-5 w-5 rounded-full ${index === 1 ? style.bg : 'bg-[var(--brand-background)]'}`}
                />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className={`rounded-lg border ${border} ${background} p-2`}>
                    <div className={`h-2 w-full rounded-sm ${textMuted}`} />
                    <div className="mt-2 flex items-center justify-between">
                      <div className={`h-1.5 w-10 rounded-sm ${textMuted}`} />
                      <div className={`h-4 w-4 rounded-full ${style.iconBg}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );

    case 'modal':
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-slate-900/10 p-4">
          <div
            className={`relative flex w-4/5 flex-col gap-3 rounded-lg border ${border} ${surface} p-4 shadow-lg`}
          >
            <div className={`flex items-center justify-between border-b ${borderSoft} pb-2`}>
              <div className={`h-2.5 w-24 rounded-sm ${text}`} />
              <div className={`h-3 w-3 rounded-full ${textMuted}`} />
            </div>
            <div className="space-y-2">
              <div className={`h-2 w-full rounded-sm ${background}`} />
              <div className={`h-2 w-full rounded-sm ${background}`} />
              <div className={`h-2 w-2/3 rounded-sm ${background}`} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <div className={`h-6 w-16 rounded-md ${background}`} />
              <div className={`h-6 w-16 rounded-md ${style.bg}`} />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div
          className={`relative flex flex-1 flex-col items-center justify-center border-t p-4 ${style.iconBg} ${style.border} bg-opacity-30`}
        >
          <div className={style.iconColor}>
            <Layout className="h-8 w-8 opacity-50" />
          </div>
          {label ? (
            <div className="mt-3 flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-[var(--brand-secondary-light)]">
              {lockIconVisible ? <Lock className="h-3 w-3 opacity-50" /> : null}
              <span>{label}</span>
            </div>
          ) : null}
        </div>
      );
  }
}
