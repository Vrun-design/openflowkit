import { useEffect, useState } from 'react';

// Appearance stays scoped to V2; explicit preference overrides the OS.
function resolveAppearance(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useV2Appearance(preference: 'system' | 'light' | 'dark' = 'system'): 'light' | 'dark' {
  const [appearance, setAppearance] = useState(resolveAppearance);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => setAppearance(resolveAppearance());
    media.addEventListener('change', onMedia);
    return () => {
      media.removeEventListener('change', onMedia);
    };
  }, []);
  return preference === 'system' ? appearance : preference;
}
