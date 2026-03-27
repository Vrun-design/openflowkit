import React from 'react';

const LOGO_SRC = '/favicon.svg';

export const OpenFlowLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <img
            src={LOGO_SRC}
            alt=""
            aria-hidden="true"
            className={`object-contain ${className}`.trim()}
        />
    );
};
