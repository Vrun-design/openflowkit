import type React from 'react';
import { ChevronLeft } from 'lucide-react';
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

interface MobileVariantRendererParams {
  imageUrl?: string;
  variant?: string;
  style: ThemeColors;
  imageAlt: string;
}

export function renderMobileVariantContent({
  imageUrl,
  variant,
  style,
  imageAlt,
}: MobileVariantRendererParams): React.ReactElement {
  if (imageUrl) {
    return <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />;
  }

  switch (variant) {
    case 'login':
      return (
        <div
          className={`flex h-full flex-col items-center justify-center space-y-5 ${surface} p-6`}
        >
          <div
            className={`mb-1 flex h-14 w-14 items-center justify-center rounded-2xl ${style.iconBg}`}
          >
            <div className={`h-8 w-8 rounded-full ${surface} opacity-50`} />
          </div>
          <div className="w-full space-y-3">
            <div
              className={`flex h-10 items-center rounded-xl border ${borderSoft} ${background} px-4`}
            >
              <div className={`h-2 w-16 rounded-sm ${textMuted}`} />
            </div>
            <div
              className={`flex h-10 items-center rounded-xl border ${borderSoft} ${background} px-4`}
            >
              <div className={`h-2 w-12 rounded-sm ${textMuted}`} />
            </div>
          </div>
          <div
            className={`flex h-10 w-full items-center justify-center rounded-xl shadow-sm ${style.bg}`}
          >
            <div className={`h-2 w-12 rounded-sm ${surface} opacity-90`} />
          </div>
          <div className="flex gap-3 pt-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`h-10 w-10 rounded-full ${background}`} />
            ))}
          </div>
        </div>
      );

    case 'social':
      return (
        <div className={`flex h-full flex-col ${background}`}>
          <div className={`flex h-12 items-center border-b ${borderSoft} ${surface} px-4`}>
            <div className={`h-4 w-24 rounded-sm ${text}`} />
          </div>
          <div className={`mt-2 ${surface} pb-4`}>
            <div className="flex items-center gap-2 p-3">
              <div className={`h-8 w-8 rounded-full ${textMuted}`} />
              <div className={`h-2.5 w-16 rounded-sm ${textSoft}`} />
            </div>
            <div
              className={`flex aspect-square w-full items-center justify-center ${background} text-[var(--brand-secondary-light)]`}
            >
              <div className={`h-12 w-12 rounded-lg border-2 border-dashed ${border}`} />
            </div>
            <div className="space-y-2 p-3">
              <div className="flex gap-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className={`h-5 w-5 rounded-full ${textMuted}`} />
                ))}
              </div>
              <div className={`mt-2 h-2 w-2/3 rounded-sm ${textMuted}`} />
              <div className={`h-2 w-1/3 rounded-sm ${background}`} />
            </div>
          </div>
        </div>
      );

    case 'chat':
      return (
        <div className={`flex h-full flex-col ${surface}`}>
          <div
            className={`z-10 flex h-12 items-center gap-3 border-b ${borderSoft} ${surface} px-4`}
          >
            <ChevronLeft className="h-5 w-5 text-[var(--brand-secondary-light)]" />
            <div className={`h-8 w-8 rounded-full ${textMuted}`} />
            <div className={`h-2.5 w-20 rounded-sm ${text}`} />
          </div>
          <div className={`flex-1 space-y-4 ${background} p-4`}>
            <div className="flex gap-2">
              <div className={`h-8 w-8 shrink-0 rounded-full ${textMuted}`} />
              <div
                className={`max-w-[70%] space-y-1.5 rounded-2xl rounded-tl-sm ${surface} p-2.5 shadow-sm`}
              >
                <div className={`h-2 w-32 rounded-sm ${textMuted}`} />
                <div className={`h-2 w-20 rounded-sm ${textMuted}`} />
              </div>
            </div>
            <div className="flex justify-end">
              <div className={`max-w-[70%] rounded-2xl rounded-tr-sm p-2.5 shadow-sm ${style.bg}`}>
                <div className={`h-2 w-24 rounded-sm ${surface} opacity-90`} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className={`h-8 w-8 shrink-0 rounded-full ${textMuted}`} />
              <div
                className={`flex h-24 w-40 items-center justify-center rounded-2xl rounded-tl-sm ${surface} p-2 shadow-sm`}
              >
                <div className={`h-8 w-8 rounded border-2 border-dashed ${borderSoft}`} />
              </div>
            </div>
          </div>
          <div className={`h-14 border-t ${borderSoft} ${surface} p-3`}>
            <div className={`flex h-full items-center rounded-full ${background} px-4`}>
              <div className={`h-2 w-32 rounded-sm ${textSoft}`} />
            </div>
          </div>
        </div>
      );

    case 'product':
      return (
        <div className={`flex h-full flex-col ${surface}`}>
          <div className={`relative flex h-[45%] items-center justify-center ${background}`}>
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-lg ${surface} shadow-sm`}
            >
              <div className={`h-12 w-12 rounded border-2 border-dashed ${borderSoft}`} />
            </div>
            <div
              className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full ${surface} shadow-sm`}
            >
              <div className={`h-4 w-4 rounded-full ${textMuted}`} />
            </div>
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-4 space-y-2">
              <div className={`h-4 w-full rounded-sm ${text}`} />
              <div className={`h-4 w-2/3 rounded-sm ${text}`} />
            </div>
            <div className={`mb-6 h-4 w-16 rounded-sm ${textMuted}`} />
            <div className="mt-auto space-y-3">
              <div className={`h-2 w-full rounded-sm ${background}`} />
              <div className={`h-2 w-full rounded-sm ${background}`} />
              <div className={`h-2 w-2/3 rounded-sm ${background}`} />
            </div>
          </div>
          <div className={`flex h-20 items-center gap-4 border-t ${borderSoft} ${surface} p-4`}>
            <div className="flex-1 space-y-1">
              <div className={`h-2 w-10 rounded-sm ${textSoft}`} />
              <div className={`h-3 w-16 rounded-sm ${text}`} />
            </div>
            <div
              className={`flex h-12 w-32 items-center justify-center rounded-xl shadow-sm ${style.bg}`}
            >
              <div className={`h-2 w-12 rounded-sm ${surface}`} />
            </div>
          </div>
        </div>
      );

    case 'wallet':
      return (
        <div className="flex h-full flex-col bg-slate-950 text-white">
          <div className={`mx-4 mt-5 rounded-3xl p-4 ${style.bg}`}>
            <div className="h-2 w-20 rounded-sm bg-white/40" />
            <div className="mt-3 h-6 w-28 rounded-sm bg-white/80" />
            <div className="mt-6 flex justify-between">
              <div className="h-2 w-14 rounded-sm bg-white/40" />
              <div className="h-2 w-10 rounded-sm bg-white/40" />
            </div>
          </div>
          <div className="p-4">
            <div className="mb-3 h-2.5 w-24 rounded-sm bg-white/20" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-2xl ${style.iconBg}`} />
                    <div className="space-y-1.5">
                      <div className="h-2 w-16 rounded-sm bg-white/30" />
                      <div className="h-1.5 w-10 rounded-sm bg-white/15" />
                    </div>
                  </div>
                  <div className="h-2 w-12 rounded-sm bg-white/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'calendar':
      return (
        <div className={`flex h-full flex-col ${surface}`}>
          <div className={`p-4 ${style.iconBg}`}>
            <div className="flex items-center justify-between">
              <div className={`h-3 w-20 rounded-sm ${text}`} />
              <div className={`h-8 w-8 rounded-full ${style.bg}`} />
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }, (_, index) => (
                <div
                  key={index}
                  className={`flex h-8 items-center justify-center rounded-xl text-[10px] ${index === 10 || index === 16 ? style.bg : index > 20 ? 'bg-[var(--brand-surface)]/80' : 'bg-[var(--brand-surface)]/50'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-2 p-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className={`rounded-2xl border ${border} ${background} p-3`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className={`h-2.5 w-20 rounded-sm ${textSoft}`} />
                    <div className={`h-1.5 w-14 rounded-sm ${textMuted}`} />
                  </div>
                  <div className={`h-8 w-1 rounded-full ${style.bg}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'maps':
      return (
        <div className="relative h-full bg-emerald-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[length:auto,44px_44px,44px_44px]" />
          <div
            className={`absolute left-6 right-6 top-5 rounded-2xl border ${border} bg-[var(--brand-surface)]/95 p-3 shadow-sm`}
          >
            <div className={`h-3 w-24 rounded-sm ${textSoft}`} />
            <div className={`mt-3 h-10 rounded-xl ${background}`} />
          </div>
          <div className="absolute left-1/2 top-[48%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[var(--brand-surface)] bg-rose-500 shadow-lg" />
          <div
            className={`absolute bottom-6 left-4 right-4 rounded-3xl border ${border} ${surface} p-4 shadow-xl`}
          >
            <div className={`h-2.5 w-28 rounded-sm ${text}`} />
            <div className="mt-3 space-y-2">
              <div className={`h-2 w-full rounded-sm ${textMuted}`} />
              <div className={`h-2 w-2/3 rounded-sm ${textMuted}`} />
            </div>
            <div className={`mt-4 h-10 rounded-2xl ${style.bg}`} />
          </div>
        </div>
      );

    case 'music':
      return (
        <div className="flex h-full flex-col bg-slate-950 text-white">
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <div className="h-40 w-40 rounded-[2rem] bg-gradient-to-br from-white/20 to-white/5 shadow-2xl" />
            <div className="mt-6 h-3 w-28 rounded-sm bg-white/80" />
            <div className="mt-2 h-2 w-20 rounded-sm bg-white/30" />
            <div className="mt-8 h-1.5 w-full rounded-full bg-white/10">
              <div className={`h-full w-1/2 rounded-full ${style.bg}`} />
            </div>
            <div className="mt-8 flex items-center gap-5">
              <div className="h-8 w-8 rounded-full bg-white/10" />
              <div className={`h-14 w-14 rounded-full ${style.bg}`} />
              <div className="h-8 w-8 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="border-t border-white/10 p-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="mb-2 flex items-center gap-3 rounded-2xl bg-white/5 p-2 last:mb-0"
              >
                <div className="h-10 w-10 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-24 rounded-sm bg-white/25" />
                  <div className="h-1.5 w-14 rounded-sm bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'fitness':
      return (
        <div className="flex h-full flex-col bg-slate-950 text-white">
          <div className="p-5">
            <div className="h-3 w-24 rounded-sm bg-white/80" />
            <div className="mt-5 flex items-center justify-center">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-white/10">
                <div
                  className={`absolute inset-0 rounded-full border-[14px] border-transparent ${style.border}`}
                />
                <div className="h-14 w-14 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="mx-auto h-6 w-20 rounded-sm bg-white/80" />
              <div className="mx-auto mt-2 h-2 w-24 rounded-sm bg-white/20" />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 px-4 pb-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-3xl bg-white/5 p-3">
                <div className="h-2 w-14 rounded-sm bg-white/25" />
                <div
                  className={`mt-3 h-12 rounded-2xl ${item % 2 === 0 ? style.bg : 'bg-white/10'}`}
                />
              </div>
            ))}
          </div>
        </div>
      );

    case 'list':
    case 'profile':
      return (
        <div className={`flex h-full flex-col ${surface}`}>
          <div className={`flex h-12 items-center justify-between border-b ${borderSoft} px-4`}>
            <div className={`h-3 w-24 rounded-sm ${text}`} />
            <div className={`h-6 w-6 rounded-full ${background}`} />
          </div>
          <div className="flex-1 space-y-2 p-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className={`flex items-center gap-3 rounded-lg border ${borderSoft} p-2`}
              >
                <div className={`h-10 w-10 shrink-0 rounded-lg ${background}`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-2.5 w-32 rounded-sm ${text} opacity-80`} />
                  <div className={`h-2 w-20 rounded-sm ${textMuted}`} />
                </div>
                <div className={`h-4 w-4 rounded-full ${background}`} />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div
          className={`relative flex flex-1 flex-col items-center justify-center p-4 ${style.iconBg} bg-opacity-30`}
        >
          <div className={`h-20 w-12 rounded border-2 border-dashed ${style.border}`} />
        </div>
      );
  }
}
