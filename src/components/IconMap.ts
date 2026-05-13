import React from 'react';
import {
    Activity,
    AlertTriangle,
    Bell,
    Box,
    Cable,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Cloud,
    Code,
    Container,
    Cpu,
    CreditCard,
    Database,
    DollarSign,
    Edit,
    File,
    FileText,
    Folder,
    FunctionSquare,
    GitBranch,
    GitFork,
    Globe,
    Group,
    HelpCircle,
    Home,
    ImageIcon,
    Info,
    Key,
    KeyRound,
    Layers,
    LifeBuoy,
    Link,
    Lock,
    LockKeyhole,
    LogIn,
    Mail,
    MapPin,
    MessageSquare,
    Monitor,
    Network,
    Package,
    Radar,
    Route,
    Rows3,
    Save,
    Search,
    Server,
    ServerCog,
    Settings,
    Share,
    Shield,
    ShieldCheck,
    ShipWheel,
    ShoppingCart,
    SlidersHorizontal,
    Smartphone,
    Tablet,
    Terminal,
    Trash,
    Truck,
    Unlock,
    Upload,
    User,
    Users,
    Waypoints,
    X,
    Zap,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const FALLBACK_ICON_NAME = 'Settings';

const ICON_COMPONENTS = {
    Activity,
    AlertTriangle,
    Bell,
    Box,
    Cable,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Cloud,
    Code,
    Container,
    Cpu,
    CreditCard,
    Database,
    DollarSign,
    Edit,
    File,
    FileText,
    Folder,
    FunctionSquare,
    GitBranch,
    GitFork,
    Globe,
    Group,
    HelpCircle,
    Home,
    ImageIcon,
    Info,
    Key,
    KeyRound,
    Layers,
    LifeBuoy,
    Link,
    Lock,
    LockKeyhole,
    LogIn,
    Mail,
    MapPin,
    MessageSquare,
    Monitor,
    Network,
    Package,
    Radar,
    Route,
    Rows3,
    Save,
    Search,
    Server,
    ServerCog,
    Settings,
    Share,
    Shield,
    ShieldCheck,
    ShipWheel,
    ShoppingCart,
    SlidersHorizontal,
    Smartphone,
    Tablet,
    Terminal,
    Trash,
    Truck,
    Unlock,
    Upload,
    User,
    Users,
    Waypoints,
    X,
    Zap,
} satisfies Record<string, React.ElementType>;

type IconName = keyof typeof ICON_COMPONENTS;

const ICON_ALIASES: Record<string, string> = {
    image: 'ImageIcon',
    imageicon: 'ImageIcon',
    login: 'LogIn',
    signin: 'LogIn',
    signinicon: 'LogIn',
};

export const ICON_MAP = ICON_COMPONENTS;
export const ICON_NAMES: string[] = Object.keys(ICON_COMPONENTS);

export const ICON_PICKER_PRIORITY_NAMES: string[] = [
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
];

function normalizeIconLookupKey(iconName: string): string {
    return iconName.replace(/[\s_-]/g, '').toLowerCase();
}

function isIconName(iconName: string): iconName is IconName {
    return iconName in ICON_MAP;
}

export function resolveIconName(iconName?: string, fallback: string = FALLBACK_ICON_NAME): IconName {
    if (!iconName || iconName === 'none') {
        return isIconName(fallback) ? fallback : FALLBACK_ICON_NAME;
    }

    if (isIconName(iconName)) {
        return iconName;
    }

    const normalizedKey = normalizeIconLookupKey(iconName);
    const aliasedName = ICON_ALIASES[normalizedKey];
    if (aliasedName && isIconName(aliasedName)) {
        return aliasedName;
    }

    const matchedKey = ICON_NAMES.find((key) => normalizeIconLookupKey(key) === normalizedKey);
    if (matchedKey && isIconName(matchedKey)) {
        return matchedKey;
    }

    return isIconName(fallback) ? fallback : FALLBACK_ICON_NAME;
}

type NamedIconProps = LucideProps & {
    name?: string;
    fallbackName?: string;
};

export function NamedIcon({ name, fallbackName = FALLBACK_ICON_NAME, ...props }: NamedIconProps): React.ReactElement {
    const resolvedName = resolveIconName(name, fallbackName);
    const IconComponent = ICON_MAP[resolvedName] ?? ICON_MAP[FALLBACK_ICON_NAME];
    return React.createElement(IconComponent, props);
}
