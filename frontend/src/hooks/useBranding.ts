/**
 * useBranding — fetches logo URLs from the backend (backed by S3).
 * Returns null for each logo until uploaded to S3 by admin.
 * Cached in memory for the session so it only fetches once.
 */
import { useState, useEffect } from 'react';

export interface Logos {
  logo_cyan:  string | null;
  logo_white: string | null;
  logo_icon:  string | null;
}

export interface BrandingResult {
  logos: Logos;
  loading: boolean;
}

const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

// Local static fallbacks — drop files in frontend/public/logos/
// These are used when S3 hasn't been configured yet
const LOCAL_LOGOS: Logos = {
  logo_cyan:  '/logos/logo-cyan.png',
  logo_white: '/logos/logo-white.png',
  logo_icon:  '/logos/logo-icon.png',
};

// Module-level cache — survives re-renders, cleared on page reload
let _cache: Logos | null = null;
let _promise: Promise<Logos> | null = null;

// Merge: prefer S3 URL from backend, fall back to local file
function withFallbacks(logos: Logos): Logos {
  return {
    logo_cyan:  logos.logo_cyan  || LOCAL_LOGOS.logo_cyan,
    logo_white: logos.logo_white || LOCAL_LOGOS.logo_white,
    logo_icon:  logos.logo_icon  || LOCAL_LOGOS.logo_icon,
  };
}

export async function fetchLogos(): Promise<Logos> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch(`${API}/api/config/branding`)
    .then(r => r.json())
    .then(data => {
      _cache = withFallbacks(data.logos ?? {});
      return _cache!;
    })
    .catch(() => {
      _cache = LOCAL_LOGOS;
      return _cache;
    });

  return _promise;
}

export const EMPTY_LOGOS: Logos = LOCAL_LOGOS;

export function useBranding(): BrandingResult {
  const [logos, setLogos] = useState<Logos>(_cache ?? EMPTY_LOGOS);
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

// Re-export BrandLogo component so callers can still do:
//   import { BrandLogo } from '../hooks/useBranding'
export { BrandLogo } from './BrandLogo';
