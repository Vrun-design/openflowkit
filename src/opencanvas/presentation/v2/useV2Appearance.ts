import { useEffect, useState } from 'react';

// The host app owns the theme (ThemeProvider writes data-theme and the
// localStorage key). v2 reads the resolved value without importing the legacy
// theme store, so the v2 graph stays deletable. Screenshots toggle the same
// key, so light/dark evidence follows automatically.
function resolveAppearance(): 'light' | 'dark' {
  const attribute = window.document.documentElement.getAttribute('data-theme');
  if (attribute === 'dark' || attribute === 'light') return attribute;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useV2Appearance(): 'light' | 'dark' {
  const [appearance, setAppearance] = useState(resolveAppearance);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => setAppearance(resolveAppearance());
    const observer = new MutationObserver(() => setAppearance(resolveAppearance()));
    observer.observe(window.document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    media.addEventListener('change', onMedia);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', onMedia);
    };
  }, []);
  return appearance;
}
