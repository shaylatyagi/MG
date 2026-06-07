// apps/web/lib/auth.ts — JWT decode helpers
export interface JwtPayload {
  id: number | string;
  role: 'driver' | 'owner' | 'manager' | 'admin';
  phone: string;
  owner_id?: number;
  company_id?: number;
  permissions?: string[];
  iat: number;
  exp: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString()
    ) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/mg_token=([^;]+)/);
  return match ? match[1] : null;
}

export function isTokenExpired(payload: JwtPayload): boolean {
  return payload.exp < Math.floor(Date.now() / 1000);
}
