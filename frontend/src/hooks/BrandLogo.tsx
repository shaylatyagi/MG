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
    // Logo aspect ratio 894×220 ≈ 4.06 — explicit width prevents CLS
    const computedWidth = Math.round(height * (894 / 220));
    return (
      <img
        src={url}
        alt={alt}
        width={computedWidth}
        height={height}
        style={{ height, width: 'auto', maxWidth: computedWidth, objectFit: 'contain', ...style }}
        className={className}
        onError={() => setImgErr(true)}
        fetchPriority="high"
        decoding="async"
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
