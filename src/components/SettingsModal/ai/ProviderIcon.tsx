import React, { useState } from 'react';
import { ProviderMeta } from '@/config/aiProviders';

interface ProviderIconProps {
    provider: ProviderMeta;
    isSelected: boolean;
}

export function ProviderIcon({ provider, isSelected }: ProviderIconProps): React.ReactElement {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return <span className="text-2xl" style={{ color: isSelected ? 'var(--brand-primary)' : undefined }}>{provider.icon}</span>;
    }

    if (isSelected) {
        return (
            <div
                className="w-8 h-8 bg-[var(--brand-primary)]"
                style={{
                    maskImage: `url(${provider.logoPath})`,
                    WebkitMaskImage: `url(${provider.logoPath})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                }}
            />
        );
    }

    return (
        <img
            src={provider.logoPath}
            alt={provider.name}
            className="w-8 h-8 object-contain"
            onError={() => setImgError(true)}
        />
    );
}
