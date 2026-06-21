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

// Module-level cache — survives re-renders, cleared on page reload
let _cache: Logos | null = null;
let _promise: Promise<Logos> | null = null;

export async function fetchLogos(): Promise<Logos> {
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

export const EMPTY_LOGOS: Logos = { logo_cyan: null, logo_white: null, logo_icon: null };

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
