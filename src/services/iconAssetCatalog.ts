import type { DomainLibraryItem } from '@/services/domainLibrary';

type IconAssetCategory =
    | 'Core'
    | 'Flow'
    | 'Data'
    | 'Communication'
    | 'Security'
    | 'Commerce'
    | 'Files'
    | 'People'
    | 'Devices'
    | 'Status'
    | 'Infra';

const ICON_CATEGORY_MAP: Partial<Record<string, IconAssetCategory>> = {
    Activity: 'Status',
    AlertTriangle: 'Status',
    Bell: 'Communication',
    Box: 'Infra',
    Cable: 'Infra',
    Calendar: 'Core',
    Check: 'Status',
    CheckCircle: 'Status',
    Clock: 'Core',
    Cloud: 'Infra',
    Code: 'Flow',
    Container: 'Infra',
    Cpu: 'Infra',
    CreditCard: 'Commerce',
    Database: 'Data',
    DollarSign: 'Commerce',
    Edit: 'Core',
    File: 'Files',
    FileText: 'Files',
    Folder: 'Files',
    FunctionSquare: 'Flow',
    GitBranch: 'Flow',
    GitFork: 'Flow',
    Globe: 'Infra',
    Group: 'People',
    HelpCircle: 'Core',
    Home: 'Core',
    ImageIcon: 'Files',
    Info: 'Core',
    Key: 'Security',
    KeyRound: 'Security',
    Layers: 'Flow',
    LifeBuoy: 'Communication',
    Link: 'Flow',
    Lock: 'Security',
    LockKeyhole: 'Security',
    LogIn: 'Security',
    Mail: 'Communication',
    MapPin: 'Core',
    MessageSquare: 'Communication',
    Monitor: 'Devices',
    Network: 'Infra',
    Package: 'Infra',
    Radar: 'Infra',
    Route: 'Flow',
    Rows3: 'Flow',
    Save: 'Core',
    Search: 'Core',
    Server: 'Infra',
    ServerCog: 'Infra',
    Settings: 'Core',
    Share: 'Communication',
    Shield: 'Security',
    ShieldCheck: 'Security',
    ShipWheel: 'Infra',
    ShoppingCart: 'Commerce',
    SlidersHorizontal: 'Core',
    Smartphone: 'Devices',
    Tablet: 'Devices',
    Terminal: 'Flow',
    Trash: 'Core',
    Truck: 'Commerce',
    Unlock: 'Security',
    Upload: 'Files',
    User: 'People',
    Users: 'People',
    Waypoints: 'Flow',
    X: 'Status',
    Zap: 'Status',
};

function getIconCategory(iconName: string): IconAssetCategory {
    return ICON_CATEGORY_MAP[iconName] ?? 'Core';
}

function createIconAssetItem(iconName: string): DomainLibraryItem {
    const category = getIconCategory(iconName);
    return {
        id: `lucide:${iconName}`,
        category: 'icons',
        label: iconName,
        description: `Lucide ${category}`,
        icon: iconName,
        color: 'slate',
        nodeType: 'custom',
        assetPresentation: 'icon',
        providerShapeCategory: category,
    };
}

// Lucide icon names offered as canvas assets, most-used first.
const ICON_NAMES: string[] = [
    'Database',
    'Server',
    'User',
    'Users',
    'Globe',
    'Cloud',
    'Lock',
    'Unlock',
    'Shield',
    'ShieldCheck',
    'Key',
    'Mail',
    'MessageSquare',
    'File',
    'FileText',
    'Folder',
    'Code',
    'Terminal',
    'Settings',
    'Cpu',
    'Smartphone',
    'Tablet',
    'Monitor',
    'CreditCard',
    'DollarSign',
    'ShoppingCart',
    'Box',
    'Package',
    'Truck',
    'MapPin',
    'Search',
    'Bell',
    'Calendar',
    'Clock',
    'Check',
    'CheckCircle',
    'X',
    'AlertTriangle',
    'Info',
    'HelpCircle',
    'Home',
    'Link',
    'Share',
    'Trash',
    'Save',
    'Edit',
    'GitBranch',
    'Layers',
    'Waypoints',
    'Network',
    'Activity',
    'Cable',
    'Container',
    'FunctionSquare',
    'GitFork',
    'Group',
    'ImageIcon',
    'KeyRound',
    'LifeBuoy',
    'LockKeyhole',
    'LogIn',
    'Radar',
    'Route',
    'Rows3',
    'ServerCog',
    'ShipWheel',
    'SlidersHorizontal',
    'Upload',
    'Zap',
];

export const ICON_ASSET_ITEMS: DomainLibraryItem[] = ICON_NAMES.map(createIconAssetItem);

export function loadIconAssetCatalog(): DomainLibraryItem[] {
    return ICON_ASSET_ITEMS;
}

export function listIconAssetCategories(): string[] {
    return Array.from(new Set(ICON_ASSET_ITEMS.map((item) => item.providerShapeCategory || 'Core'))).sort((left, right) => left.localeCompare(right));
}

export function loadIconAssetSuggestions(options: {
    category?: string;
    excludeIcon?: string;
    limit?: number;
    query?: string;
} = {}): DomainLibraryItem[] {
    const normalizedQuery = options.query?.trim().toLowerCase() ?? '';
    return ICON_ASSET_ITEMS.filter((item) => {
        if (options.excludeIcon && item.icon === options.excludeIcon) {
            return false;
        }
        if (options.category && options.category !== 'all' && item.providerShapeCategory !== options.category) {
            return false;
        }
        if (!normalizedQuery) {
            return true;
        }
        return item.label.toLowerCase().includes(normalizedQuery)
            || item.description.toLowerCase().includes(normalizedQuery)
            || (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery);
    }).slice(0, options.limit ?? 18);
}
