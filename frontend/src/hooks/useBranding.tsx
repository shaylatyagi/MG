/**
 * useBranding — fetches logo URLs from the backend (backed by S3).
 * Returns null for each logo until uploaded to S3 by admin.
 * Cached in memory for the session so it only fetches once.
 */
import React, { useState, useEffect } from 'react';

interface Logos {
  logo_cyan:  string | null;  // dark navy bg + cyan  (primary)
  logo_white: string | null;  // black bg + white     (for dark overlays)
  logo_icon:  string | null;  // icon only
}

interface BrandingResult {
  logos: Logos;
  loading: boolean;
}

const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

// Module-level cache — survives re-renders, cleared on page reload
let _cache: Logos | null = null;
let _promise: Promise<Logos> | null = null;

async function fetchLogos(): Promise<Logos> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch(`${API}/api/config/branding`)
    .then(r => r.json())
    .then(data => {
      _cache = data.logos ?? { logo_cyan: null, logo_white: null, logo_icon: null };
      return _cache!;
    })
    .catch(() => {
      const fallback = { logo_cyan: null, logo_white: null, logo_icon: null };
      _cache = fallback;
      return fallback;
    });

  return _promise;
}

const EMPTY: Logos = { logo_cyan: null, logo_white: null, logo_icon: null };

export function useBranding(): BrandingResult {
  const [logos, setLogos] = useState<Logos>(_cache ?? EMPTY);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    fetchLogos().then(l => {
      setLogos(l);
      setLoading(false);
    });
  }, []);

  return { logos, loading };
}

/**
 * BrandLogo — drop-in component.
 * Shows the S3 logo image when available, falls back to text.
 *
 * Usage:
 *   <BrandLogo variant="cyan" height={36} alt="MobilityGrid" />
 */
interface BrandLogoProps {
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
  const key = variant === 'cyan' ? 'logo_cyan' : variant === 'white' ? 'logo_white' : 'logo_icon';
  const url = logos[key];

  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        height={height}
        style={{ height, width: 'auto', objectFit: 'contain', ...style }}
        className={className}
      />
    );
  }

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
