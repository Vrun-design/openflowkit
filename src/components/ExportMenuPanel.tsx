import React from 'react';
import type { ComponentType } from 'react';
import { BookOpen, Figma, FileCode, FileJson, Film, FileText, GitBranch, Image, Link, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '@/lib/brand';

interface ExportMenuPanelProps {
    onSelect: (key: string) => void;
}

interface ExportOption {
    key: string;
    label: string;
    hint: string;
    Icon: ComponentType<{ className?: string }>;
}

interface ExportSection {
    title: string;
    items: ExportOption[];
}

function SectionRow({ item, onSelect }: { item: ExportOption; onSelect: (key: string) => void }): React.ReactElement {
    return (
        <button
            onClick={() => onSelect(item.key)}
            data-testid={`export-${item.key}`}
            className="flex items-center gap-2.5 px-2.5 py-2 text-left rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] w-full group"
        >
            <item.Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-[var(--brand-primary)]" />
            <div className="min-w-0 flex-1">
                <span className="text-[13px] font-medium text-slate-700 group-hover:text-[var(--brand-primary)]">{item.label}</span>
                <span className="ml-1.5 text-[10px] text-slate-400">{item.hint}</span>
            </div>
        </button>
    );
}

export function ExportMenuPanel({ onSelect }: ExportMenuPanelProps): React.ReactElement {
    const { t } = useTranslation();

    const sections: ExportSection[] = [
        {
            title: t('export.sectionImage', 'Image'),
            items: [
                { key: 'png', label: 'PNG', hint: t('export.hintTransparent4K', 'Transparent'), Icon: Image },
                { key: 'jpeg', label: 'JPG', hint: t('export.hintWhiteBg4K', 'White bg'), Icon: Image },
                { key: 'svg', label: 'SVG', hint: t('export.hintSvgScalable', 'Vector'), Icon: Image },
                { key: 'pdf', label: 'PDF', hint: 'Document', Icon: FileText },
            ],
        },
        {
            title: t('export.sectionVideo', 'Video & Animation'),
            items: [
                { key: 'video', label: t('export.video', 'Playback Video'), hint: 'WebM/MP4', Icon: Film },
                { key: 'gif', label: t('export.gif', 'Playback GIF'), hint: 'Loop', Icon: Film },
                { key: 'reveal-video', label: t('export.revealVideo', 'Reveal Video'), hint: 'Cinematic', Icon: Film },
                { key: 'reveal-gif', label: t('export.revealGif', 'Reveal GIF'), hint: 'Cinematic', Icon: Film },
            ],
        },
        {
            title: t('export.sectionCode', 'Code & Data'),
            items: [
                { key: 'json', label: t('export.jsonLabel', 'JSON'), hint: t('export.hintDownload', 'Download'), Icon: FileJson },
                { key: 'openflow', label: t('export.openflowdslLabel', { appName: APP_NAME, defaultValue: `${APP_NAME} DSL` }), hint: 'Clipboard', Icon: Wand2 },
                { key: 'mermaid', label: t('export.mermaid', 'Mermaid'), hint: 'Clipboard', Icon: GitBranch },
                { key: 'plantuml', label: t('export.plantuml', 'PlantUML'), hint: 'Clipboard', Icon: FileCode },
                { key: 'figma', label: t('export.figmaEditable', 'Figma'), hint: 'Editable SVG', Icon: Figma },
                { key: 'readme', label: t('export.readmeEmbed', 'README Embed'), hint: 'Markdown', Icon: BookOpen },
            ],
        },
        {
            title: t('export.shareSection', 'Share'),
            items: [
                { key: 'share', label: t('export.share', 'Share live canvas'), hint: t('export.hintShareViewer', 'Invite link'), Icon: Link },
            ],
        },
    ];

    return (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-white/20 ring-1 ring-black/5 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
            {sections.map((section, sectionIndex) => (
                <React.Fragment key={section.title}>
                    {sectionIndex > 0 && <div className="my-1.5 border-t border-slate-100" />}
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {section.title}
                    </div>
                    {section.items.map((item) => (
                        <SectionRow key={item.key} item={item} onSelect={onSelect} />
                    ))}
                </React.Fragment>
            ))}
        </div>
    );
}
