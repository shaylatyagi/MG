import React, { useState } from 'react';
import { useBranding } from './useBranding';

export interface BrandLogoProps {
  variant?: 'cyan' | 'white' | 'icon';
  height?: number;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  variant = 'cyan',
  height = 36,
  style,
  className,
  alt = 'MobilityGrid',
}: BrandLogoProps) {
  const { logos } = useBranding();
  const [imgErr, setImgErr] = useState(false);
  const key = variant === 'cyan' ? 'logo_cyan' : variant === 'white' ? 'logo_white' : 'logo_icon';
  const url = logos[key];

  if (url && !imgErr) {
    return (
      <img
        src={url}
        alt={alt}
        height={height}
        style={{ height, width: 'auto', objectFit: 'contain', ...style }}
        className={className}
        onError={() => setImgErr(true)}
      />
    );
  }

  // Fallback text when no logo uploaded / file not found
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: height * 0.55,
        letterSpacing: '-0.5px',
        color: variant === 'white' ? '#ffffff' : '#38bdf8',
        ...style,
      }}
      className={className}
    >
      Mobility Grid
    </span>
  );
}
