import type { ReactNode } from 'react';
import { SystemRoot } from '../design-system';
import { useV2Appearance } from './useV2Appearance';
import { useV2Preferences } from './useV2Preferences';
import './v2EditorPage.css';

/** The themed, centred page every standalone state route (github, dsl, share) renders inside, as home does. */
export function V2StateShell({ testId, children }: { readonly testId: string; readonly children: ReactNode }): React.JSX.Element {
  const { preferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <main className="ofk-v2-center ofk-v2-state" data-testid={testId}>{children}</main>
    </SystemRoot>
  );
}
