import React, { useMemo, useState } from 'react';
import {
    AppWindow,
    Boxes,
    Component,
    GitBranch,
    Group,
    Image as ImageIcon,
    Search,
    Shield,
    Smartphone,
    StickyNote,
    Type,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { ViewHeader } from './ViewHeader';
import { AssetsIcon } from '../icons/AssetsIcon';
import { NamedIcon } from '../IconMap';
import {
    DOMAIN_LIBRARY_ITEMS,
    type DomainLibraryCategory,
    type DomainLibraryItem,
} from '@/services/domainLibrary';

interface AssetsViewProps {
    onClose: () => void;
    handleBack: () => void;
    onAddAnnotation: () => void;
    onAddSection: () => void;
    onAddText: () => void;
    onAddJourney: () => void;
    onAddMindmap: () => void;
    onAddArchitecture: () => void;
    onAddImage: (imageUrl: string) => void;
    onAddBrowserWireframe: () => void;
    onAddMobileWireframe: () => void;
    onAddDomainLibraryItem: (item: DomainLibraryItem) => void;
}

type AssetTab = 'general' | 'aws' | 'gcp' | 'azure' | 'network' | 'security';

interface GeneralAssetItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    keywords: string[];
    action: () => void;
}

interface CloudTabDefinition {
    id: Extract<AssetTab, 'aws' | 'gcp' | 'azure' | 'network' | 'security'>;
    label: string;
    category: DomainLibraryCategory;
}

const TAB_ORDER: AssetTab[] = ['general', 'aws', 'gcp', 'azure', 'network', 'security'];

const CLOUD_TABS: CloudTabDefinition[] = [
    { id: 'aws', label: 'AWS', category: 'aws' },
    { id: 'gcp', label: 'GCP', category: 'gcp' },
    { id: 'azure', label: 'Azure', category: 'azure' },
    { id: 'network', label: 'Network', category: 'network' },
    { id: 'security', label: 'Security', category: 'security' },
];
const IMAGE_UPLOAD_INPUT_ID = 'assets-image-upload-input';

function getTileClass(): string {
    return 'group flex aspect-square flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)] hover:shadow-md';
}

function getTabButtonClass(isActive: boolean): string {
    return `h-9 rounded-[var(--radius-md)] border px-3 text-xs font-semibold transition-colors ${
        isActive
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
    }`;
}

export function AssetsView({
    onClose,
    handleBack,
    onAddAnnotation,
    onAddSection,
    onAddText,
    onAddJourney,
    onAddMindmap,
    onAddArchitecture,
    onAddImage,
    onAddBrowserWireframe,
    onAddMobileWireframe,
    onAddDomainLibraryItem,
}: AssetsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<AssetTab>('general');

    function requestImageUpload(): void {
        document.getElementById(IMAGE_UPLOAD_INPUT_ID)?.click();
    }

    function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const imageUrl = loadEvent.target?.result as string | undefined;
            if (!imageUrl) {
                return;
            }
            onAddImage(imageUrl);
            onClose();
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    const generalItems: GeneralAssetItem[] = [
        {
            id: 'sticky-note',
            label: t('toolbar.stickyNote', 'Sticky Note'),
            icon: <StickyNote className="h-5 w-5" />,
            keywords: ['sticky note', 'note', 'comment', 'annotation'],
            action: () => {
                onAddAnnotation();
                onClose();
            },
        },
        {
            id: 'text',
            label: t('toolbar.text', 'Text'),
            icon: <Type className="h-5 w-5" />,
            keywords: ['text', 'label', 'heading'],
            action: () => {
                onAddText();
                onClose();
            },
        },
        {
            id: 'section',
            label: t('toolbar.section', 'Section'),
            icon: <Group className="h-5 w-5" />,
            keywords: ['section', 'group', 'container'],
            action: () => {
                onAddSection();
                onClose();
            },
        },
        {
            id: 'journey',
            label: 'Journey',
            icon: <GitBranch className="h-5 w-5" />,
            keywords: ['journey', 'user flow', 'experience'],
            action: () => {
                onAddJourney();
                onClose();
            },
        },
        {
            id: 'mindmap',
            label: 'Mindmap',
            icon: <Component className="h-5 w-5" />,
            keywords: ['mindmap', 'topic', 'brainstorm'],
            action: () => {
                onAddMindmap();
                onClose();
            },
        },
        {
            id: 'architecture',
            label: 'Architecture',
            icon: <Boxes className="h-5 w-5" />,
            keywords: ['architecture', 'service', 'system'],
            action: () => {
                onAddArchitecture();
                onClose();
            },
        },
        {
            id: 'image',
            label: t('toolbar.image', 'Image'),
            icon: <ImageIcon className="h-5 w-5" />,
            keywords: ['image', 'media', 'upload', 'screenshot'],
            action: requestImageUpload,
        },
        {
            id: 'browser',
            label: 'Browser',
            icon: <AppWindow className="h-5 w-5" />,
            keywords: ['browser', 'desktop', 'wireframe', 'web'],
            action: () => {
                onAddBrowserWireframe();
                onClose();
            },
        },
        {
            id: 'mobile',
            label: 'Mobile',
            icon: <Smartphone className="h-5 w-5" />,
            keywords: ['mobile', 'device', 'wireframe', 'app'],
            action: () => {
                onAddMobileWireframe();
                onClose();
            },
        },
    ];

    const normalizedQuery = query.trim().toLowerCase();
    const filteredGeneralItems = generalItems.filter((item) => (
        normalizedQuery.length === 0
        || item.label.toLowerCase().includes(normalizedQuery)
        || item.keywords.some((keyword) => keyword.includes(normalizedQuery))
    ));

    const filteredCloudItems = useMemo(() => {
        return CLOUD_TABS.reduce<Record<CloudTabDefinition['id'], DomainLibraryItem[]>>((accumulator, tab) => {
            accumulator[tab.id] = DOMAIN_LIBRARY_ITEMS.filter((item) => {
                if (item.category !== tab.category) {
                    return false;
                }
                return normalizedQuery.length === 0
                    || item.label.toLowerCase().includes(normalizedQuery)
                    || item.description.toLowerCase().includes(normalizedQuery);
            });
            return accumulator;
        }, {
            aws: [],
            gcp: [],
            azure: [],
            network: [],
            security: [],
        });
    }, [normalizedQuery]);

    const tabCounts: Record<AssetTab, number> = {
        general: filteredGeneralItems.length,
        aws: filteredCloudItems.aws.length,
        gcp: filteredCloudItems.gcp.length,
        azure: filteredCloudItems.azure.length,
        network: filteredCloudItems.network.length,
        security: filteredCloudItems.security.length,
    };

    const activeCloudTab = CLOUD_TABS.find((tab) => tab.id === activeTab);

    return (
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.06),_transparent_45%)]">
            <input
                id={IMAGE_UPLOAD_INPUT_ID}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            <ViewHeader
                title={t('toolbar.assets', 'Assets')}
                icon={<AssetsIcon className="h-4 w-4 text-[var(--brand-primary)]" />}
                onBack={handleBack}
            />

            <div className="border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Insert assets</p>
                        <p className="text-xs text-slate-500">General blocks and cloud libraries in one place.</p>
                    </div>
                    <button
                        onClick={() => setIsSearchOpen((current) => !current)}
                        className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border transition-colors ${
                            isSearchOpen
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                        aria-label="Toggle asset search"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>

                {isSearchOpen && (
                    <div className="mt-3">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => event.stopPropagation()}
                            placeholder="Search assets..."
                            className="w-full focus:border-[var(--brand-primary-400)]"
                        />
                    </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                    {TAB_ORDER.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={getTabButtonClass(activeTab === tab)}
                        >
                            {tab === 'general' ? 'General' : tab.toUpperCase()}
                            <span className={`ml-2 text-[10px] ${activeTab === tab ? 'text-white/75' : 'text-slate-400'}`}>
                                {tabCounts[tab]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {activeTab === 'general' ? (
                    filteredGeneralItems.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                            {filteredGeneralItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className={getTileClass()}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-white group-hover:text-[var(--brand-primary)]">
                                        {item.icon}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-700 group-hover:text-[var(--brand-primary-900)]">
                                        {item.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-slate-600">No general assets found</div>
                        </div>
                    )
                ) : activeCloudTab ? (
                    tabCounts[activeCloudTab.id] > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                            {filteredCloudItems[activeCloudTab.id].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        onAddDomainLibraryItem(item);
                                        onClose();
                                    }}
                                    className={getTileClass()}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-white group-hover:text-[var(--brand-primary)]">
                                        <NamedIcon
                                            name={item.icon}
                                            fallbackName={activeCloudTab.id === 'security' ? 'Shield' : 'Box'}
                                            className="h-5 w-5"
                                        />
                                    </div>
                                    <div className="text-xs font-semibold text-slate-700 group-hover:text-[var(--brand-primary-900)]">
                                        {item.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                {activeCloudTab.id === 'security' ? <Shield className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                            </div>
                            <div className="mt-3 text-sm font-medium text-slate-600">No {activeCloudTab.label} assets found</div>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}
