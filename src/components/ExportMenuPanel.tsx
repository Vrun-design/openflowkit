import React, { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  Copy,
  Download,
  Figma,
  FileCode,
  FileJson,
  FileText,
  Film,
  GitBranch,
  Image,
  Share2,
  Wand2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '@/lib/brand';
import {
  type CinematicExportResolution,
  type CinematicExportSpeed,
} from '@/services/export/cinematicExport';
import { SegmentedChoice } from './properties/SegmentedChoice';
import { Button } from './ui/Button';
import { Select, type SelectOption } from './ui/Select';
import { SegmentedTabs } from './ui/SegmentedTabs';

interface ExportMenuPanelProps {
  onSelect: (key: string, action: ExportActionKey) => void;
  cinematicSpeed?: CinematicExportSpeed;
  onCinematicSpeedChange?: (speed: CinematicExportSpeed) => void;
  cinematicResolution?: CinematicExportResolution;
  onCinematicResolutionChange?: (res: CinematicExportResolution) => void;
}

type ExportCategoryKey = 'image' | 'video' | 'code';
type ExportActionKey = 'download' | 'copy';

interface ExportOption {
  key: string;
  label: string;
  hint: string;
  Icon: ComponentType<{ className?: string }>;
  actions: ExportActionKey[];
}

interface ExportSection {
  key: ExportCategoryKey;
  title: string;
  items: ExportOption[];
}

const CINEMATIC_SPEED_ITEMS = [
  { id: 'slow', label: '0.5×' },
  { id: 'normal', label: '1×' },
  { id: 'fast', label: '2×' },
] as const;

const CINEMATIC_RESOLUTION_ITEMS = [
  { id: '720p', label: '720P' },
  { id: '1080p', label: '1080P' },
  { id: '4k', label: '4K' },
] as const;

function getSectionIcon(sectionKey: ExportCategoryKey): React.ReactElement {
  if (sectionKey === 'image') {
    return <Image className="h-3.5 w-3.5" />;
  }

  if (sectionKey === 'video') {
    return <Film className="h-3.5 w-3.5" />;
  }

  if (sectionKey === 'code') {
    return <FileCode className="h-3.5 w-3.5" />;
  }

  return <Image className="h-3.5 w-3.5" />;
}

function getDefaultOptionKey(section: ExportSection): string {
  return section.items[0]?.key ?? '';
}

function getInitialSelectedKeys(sections: ExportSection[]): Record<ExportCategoryKey, string> {
  return {
    image: getDefaultOptionKey(sections.find((section) => section.key === 'image') ?? sections[0]),
    video: getDefaultOptionKey(sections.find((section) => section.key === 'video') ?? sections[0]),
    code: getDefaultOptionKey(sections.find((section) => section.key === 'code') ?? sections[0]),
  };
}

function getActionIcon(actionKey: ExportActionKey): React.ReactElement {
  if (actionKey === 'download') {
    return <Download className="h-4 w-4" />;
  }

  return <Copy className="h-4 w-4" />;
}

function getActionLabel(
  t: ReturnType<typeof useTranslation>['t'],
  action: ExportActionKey
): string {
  if (action === 'download') {
    return t('export.actionDownload', 'Download');
  }

  return t('export.actionCopy', 'Copy');
}

export function ExportMenuPanel({
  onSelect,
  cinematicSpeed = 'normal',
  onCinematicSpeedChange,
  cinematicResolution = '1080p',
  onCinematicResolutionChange,
}: ExportMenuPanelProps): React.ReactElement {
  const { t } = useTranslation();

  const sections = useMemo<ExportSection[]>(
    () => [
      {
        key: 'image',
        title: t('export.sectionImage', 'Image'),
        items: [
          {
            key: 'png',
            label: 'PNG',
            hint: t('export.hintTransparent4K', 'Transparent (4K)'),
            Icon: Image,
            actions: ['download', 'copy'],
          },
          {
            key: 'jpeg',
            label: 'JPG',
            hint: t('export.hintWhiteBg4K', 'White Background (4K)'),
            Icon: Image,
            actions: ['download', 'copy'],
          },
          {
            key: 'svg',
            label: 'SVG',
            hint: t('export.hintSvgScalable', 'Scalable vector file'),
            Icon: Image,
            actions: ['download', 'copy'],
          },
          {
            key: 'pdf',
            label: 'PDF',
            hint: t('export.hintDocument', 'Document'),
            Icon: FileText,
            actions: ['download'],
          },
        ],
      },
      {
        key: 'video',
        title: t('export.sectionVideo', 'Video'),
        items: [
          {
            key: 'cinematic-video',
            label: t('export.cinematicVideo', 'Cinematic Build Video'),
            hint: t('export.hintCinematicVideo', 'Presentation-ready animated export'),
            Icon: Film,
            actions: ['download'],
          },
        ],
      },
      {
        key: 'code',
        title: t('export.sectionCode', 'Code'),
        items: [
          {
            key: 'json',
            label: t('export.jsonLabel', 'JSON File'),
            hint: t('export.hintDownload', 'Download'),
            Icon: FileJson,
            actions: ['download', 'copy'],
          },
          {
            key: 'openflow',
            label: t('export.openflowdslLabel', {
              appName: APP_NAME,
              defaultValue: `${APP_NAME} DSL`,
            }),
            hint: t('export.actionCopy', 'Copy'),
            Icon: Wand2,
            actions: ['download', 'copy'],
          },
          {
            key: 'mermaid',
            label: t('export.mermaid', 'Mermaid'),
            hint: t('export.actionCopy', 'Copy'),
            Icon: GitBranch,
            actions: ['download', 'copy'],
          },
          {
            key: 'plantuml',
            label: t('export.plantuml', 'PlantUML'),
            hint: t('export.actionCopy', 'Copy'),
            Icon: FileCode,
            actions: ['download', 'copy'],
          },
          {
            key: 'figma',
            label: t('export.figmaEditable', 'Figma Editable'),
            hint: t('export.hintEditableSvg', 'Editable SVG'),
            Icon: Figma,
            actions: ['download', 'copy'],
          },
          {
            key: 'share',
            label: t('export.shareEmbed', 'Share & Embed'),
            hint: t('export.hintShareEmbed', 'Read-only viewer link'),
            Icon: Share2,
            actions: ['download'],
          },
        ],
      },
    ],
    [t]
  );

  const tabs = useMemo(
    () =>
      sections.map((section) => ({
        id: section.key,
        label: section.title,
        icon: <span className="hidden sm:inline-flex">{getSectionIcon(section.key)}</span>,
      })),
    [sections]
  );

  const [activeSectionKey, setActiveSectionKey] = useState<ExportCategoryKey>('image');
  const [selectedKeys, setSelectedKeys] = useState<Record<ExportCategoryKey, string>>(() =>
    getInitialSelectedKeys(sections)
  );

  const activeSection = sections.find((section) => section.key === activeSectionKey) ?? sections[0];
  const selectedItem =
    activeSection.items.find((item) => item.key === selectedKeys[activeSectionKey]) ??
    activeSection.items[0];
  const shouldShowFormatSelect = activeSection.items.length > 1;
  const selectOptions: SelectOption[] = activeSection.items.map((item) => ({
    value: item.key,
    label: item.label,
    hint: item.hint,
  }));

  function handleSectionChange(nextTab: string): void {
    setActiveSectionKey(nextTab as ExportCategoryKey);
  }

  function handleOptionChange(nextKey: string): void {
    setSelectedKeys((current) => ({
      ...current,
      [activeSectionKey]: nextKey,
    }));
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[24rem] origin-top-right rounded-[var(--radius-xl)] border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/95 p-3 shadow-[var(--shadow-overlay)] ring-1 ring-black/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]/70 bg-[color-mix(in_srgb,var(--brand-surface),var(--brand-background)_22%)] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--brand-text),transparent_94%)]">
        <h3 className="text-sm font-semibold text-[var(--brand-text)]">
          {t('export.title', 'Export')}
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--brand-secondary)]">
          {t('export.subtitle', 'Choose a format and action.')}
        </p>
      </div>

      <div className="mt-3">
        <SegmentedTabs
          items={tabs}
          value={activeSectionKey}
          onChange={handleSectionChange}
          fill
          className="pb-0"
          listClassName="rounded-[var(--brand-radius)] border border-[var(--color-brand-border)]/60 bg-[var(--brand-background)]/70 p-1 gap-1"
        />
      </div>

      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]/70 bg-[color-mix(in_srgb,var(--brand-background),var(--brand-surface)_20%)] p-3">
        <div className="mb-2 flex items-center gap-2">
          <selectedItem.Icon className="h-4 w-4 text-[var(--brand-primary)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-secondary)]">
            {activeSection.title}
          </p>
        </div>

        {shouldShowFormatSelect ? (
          <div data-testid="export-format-select">
            <Select
              value={selectedItem.key}
              onChange={handleOptionChange}
              options={selectOptions}
              placeholder={t('export.chooseFormat', 'Choose format')}
            />
          </div>
        ) : (
          <div
            data-testid="export-format-summary"
            className="rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)]/80 px-3 py-2.5"
          >
            <p className="text-sm font-medium text-[var(--brand-text)]">{selectedItem.label}</p>
            <p className="mt-1 text-xs text-[var(--brand-secondary)]">{selectedItem.hint}</p>
          </div>
        )}

        {activeSectionKey === 'video' && onCinematicSpeedChange && (
          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--brand-secondary)] mb-1.5">
              {t('export.speed', 'Speed')}
            </p>
            <SegmentedChoice
              selectedId={cinematicSpeed}
              onSelect={(speed) => onCinematicSpeedChange(speed as CinematicExportSpeed)}
              items={CINEMATIC_SPEED_ITEMS}
              columns={3}
              size="sm"
            />
          </div>
        )}

        {activeSectionKey === 'video' && onCinematicResolutionChange && (
          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--brand-secondary)] mb-1.5">
              {t('export.resolution', 'Resolution')}
            </p>
            <SegmentedChoice
              selectedId={cinematicResolution}
              onSelect={(res) => onCinematicResolutionChange(res as CinematicExportResolution)}
              items={CINEMATIC_RESOLUTION_ITEMS}
              columns={3}
              size="sm"
            />
          </div>
        )}

        <div
          className={`mt-3 grid gap-2 ${selectedItem.actions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {selectedItem.actions.map((action) => (
            <Button
              key={`${selectedItem.key}-${action}`}
              type="button"
              variant={action === 'download' ? 'primary' : 'secondary'}
              onClick={() => onSelect(selectedItem.key, action)}
              data-testid={`export-action-${selectedItem.key}-${action}`}
              className="h-11 w-full"
            >
              {getActionIcon(action)}
              {getActionLabel(t, action)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
