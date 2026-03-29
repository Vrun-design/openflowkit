import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '../../store';
import { Switch } from '../ui/Switch';
import { Grid, Magnet, Network, Zap } from 'lucide-react';
import type { GlobalEdgeOptions } from '@/lib/types';
import { useViewSettings, useVisualSettingsActions } from '@/store/viewHooks';

export function CanvasSettings(): React.ReactElement {
  const { t } = useTranslation();
  const viewSettings = useViewSettings();
  const globalEdgeOptions = useFlowStore((state) => state.globalEdgeOptions);
  const {
    toggleGrid,
    toggleSnap,
    setGlobalEdgeOptions,
    setDefaultIconsEnabled,
    setSmartRoutingEnabled,
    setSmartRoutingProfile,
    setSmartRoutingBundlingEnabled,
    setViewSettings,
    setLargeGraphSafetyMode,
    setLargeGraphSafetyProfile,
  } = useVisualSettingsActions();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">
          {t('settingsModal.canvas.title')}
        </h3>
        <div className="space-y-2">
          <SettingRow
            icon={<Grid className="h-4 w-4" />}
            label={t('settingsModal.canvas.showGrid')}
            description={t('settingsModal.canvas.showGridDesc')}
            checked={viewSettings.showGrid}
            onChange={toggleGrid}
          />
          <SettingRow
            icon={<Magnet className="h-4 w-4" />}
            label={t('settingsModal.canvas.snapToGrid')}
            description={t('settingsModal.canvas.snapToGridDesc')}
            checked={viewSettings.snapToGrid}
            onChange={toggleSnap}
          />
          <SettingRow
            icon={<Grid className="h-4 w-4" />}
            label={t('settingsModal.canvas.alignmentGuides', 'Alignment Guides')}
            description={t(
              'settingsModal.canvas.alignmentGuidesDesc',
              'Show smart guide lines while dragging nodes'
            )}
            checked={viewSettings.alignmentGuidesEnabled}
            onChange={(checked) => setViewSettings({ alignmentGuidesEnabled: checked })}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">
          {t('commandBar.visuals.title', 'Connection Styles')}
        </h3>
        <div className="space-y-3">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
              {t('commandBar.visuals.edgeStyle')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'default', label: t('commandBar.visuals.bezier') },
                { type: 'straight', label: t('commandBar.visuals.straight') },
                { type: 'smoothstep', label: t('commandBar.visuals.smoothStep') },
                { type: 'step', label: t('commandBar.visuals.step') },
              ].map((style) => (
                <button
                  key={style.type}
                  onClick={() =>
                    setGlobalEdgeOptions({ type: style.type as GlobalEdgeOptions['type'] })
                  }
                  className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-colors ${
                    globalEdgeOptions.type === style.type ||
                    (style.type === 'default' && globalEdgeOptions.type === 'bezier')
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                      : 'border-[var(--color-brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <SettingRow
            icon={<Network className="h-4 w-4" />}
            label={t('commandBar.visuals.intelligentRouting')}
            description={t('commandBar.visuals.intelligentRoutingDesc')}
            checked={viewSettings.smartRoutingEnabled}
            onChange={setSmartRoutingEnabled}
          />
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
              {t('settingsModal.canvas.routingProfile', 'Routing Profile')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  profile: 'standard',
                  label: t('settingsModal.canvas.routingProfileStandard', 'Standard'),
                },
                {
                  profile: 'infrastructure',
                  label: t('settingsModal.canvas.routingProfileInfrastructure', 'Infrastructure'),
                },
              ].map((option) => (
                <button
                  key={option.profile}
                  onClick={() =>
                    setSmartRoutingProfile(option.profile as 'standard' | 'infrastructure')
                  }
                  className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-colors ${
                    viewSettings.smartRoutingProfile === option.profile
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                      : 'border-[var(--color-brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--brand-secondary)]">
              {t(
                'settingsModal.canvas.routingProfileHint',
                'Infrastructure mode biases orthogonal routes for service maps.'
              )}
            </p>
          </div>
          <SettingRow
            icon={<Network className="h-4 w-4" />}
            label={t('settingsModal.canvas.edgeBundling', 'Bundle Sibling Edges')}
            description={t(
              'settingsModal.canvas.edgeBundlingDesc',
              'Keep parallel connections on shared lanes'
            )}
            checked={viewSettings.smartRoutingBundlingEnabled}
            onChange={setSmartRoutingBundlingEnabled}
          />
          <SettingRow
            icon={<Zap className="h-4 w-4" />}
            label={t('commandBar.visuals.animatedEdges')}
            description={t('commandBar.visuals.animatedEdgesDesc')}
            checked={globalEdgeOptions.animated}
            onChange={(checked) => setGlobalEdgeOptions({ animated: checked })}
          />
          <SettingRow
            icon={<Grid className="h-4 w-4" />}
            label={t('commandBar.visuals.defaultIcons')}
            description={t('commandBar.visuals.defaultIconsDesc')}
            checked={viewSettings.defaultIconsEnabled}
            onChange={setDefaultIconsEnabled}
          />
          <SettingRow
            icon={<Network className="h-4 w-4" />}
            label={t('settingsModal.canvas.architectureStrictMode', 'Architecture Strict Mode')}
            description={t(
              'settingsModal.canvas.architectureStrictModeDesc',
              'Block Mermaid import when architecture diagnostics include recovery/validation issues'
            )}
            checked={viewSettings.architectureStrictMode}
            onChange={(checked) => setViewSettings({ architectureStrictMode: checked })}
          />

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
              {t('commandBar.visuals.strokeWidth')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((width) => (
                <button
                  key={width}
                  onClick={() => setGlobalEdgeOptions({ strokeWidth: width })}
                  className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-colors ${
                    globalEdgeOptions.strokeWidth === width
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                      : 'border-[var(--color-brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {width}px
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
              {t('commandBar.visuals.largeGraphSafety', 'Large Graph Safety')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: 'auto', label: t('commandBar.visuals.largeGraphSafetyAuto', 'Auto') },
                { mode: 'on', label: t('commandBar.visuals.largeGraphSafetyOn', 'On') },
                { mode: 'off', label: t('commandBar.visuals.largeGraphSafetyOff', 'Off') },
              ].map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setLargeGraphSafetyMode(option.mode as 'auto' | 'on' | 'off')}
                  className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-colors ${
                    viewSettings.largeGraphSafetyMode === option.mode
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                      : 'border-[var(--color-brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="mb-2 mt-3 block text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
              Safety Profile (100 / 300 / 500)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { profile: 'performance', label: 'Performance' },
                { profile: 'balanced', label: 'Balanced' },
                { profile: 'quality', label: 'Quality' },
              ].map((option) => (
                <button
                  key={option.profile}
                  onClick={() =>
                    setLargeGraphSafetyProfile(
                      option.profile as 'performance' | 'balanced' | 'quality'
                    )
                  }
                  className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-colors ${
                    viewSettings.largeGraphSafetyProfile === option.profile
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)]'
                      : 'border-[var(--color-brand-border)] text-[var(--brand-text)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--brand-secondary)]">
              Performance starts safety at 100 nodes, Balanced at 300, Quality at 500.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SettingRow = ({
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
  onChange: (value: boolean) => void;
}): React.ReactElement => (
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
