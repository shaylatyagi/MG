const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://newmg.onrender.com';

// ── Cookie helpers ────────────────────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token    = getCookie('mg_admin_token');
  const adminKey = getCookie('mg_admin_key');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token)    headers['Authorization'] = `Bearer ${token}`;
  if (adminKey) headers['x-admin-key']   = adminKey;

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (json as { error?: { message?: string }; message?: string })
      ?.error?.message ||
      (json as { message?: string })?.message ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Unwrap { success, data } envelope — return .data if present, else full body
  const body = json as { success?: boolean; data?: unknown };
  return (body.data !== undefined ? body.data : json) as T;
}

export const api = {
  get:    <T>(path: string)                 => request<T>(path),
  post:   <T>(path: string, body: unknown)  => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string)                 => request<T>(path, { method: 'DELETE' }),
};

// ── Auth helpers ──────────────────────────────────────────────────────────────
/** Called after successful admin login — saves JWT and admin key cookie */
export function saveAdminToken(token: string, adminKey?: string) {
  setCookie('mg_admin_token', token, 30);
  if (adminKey) setCookie('mg_admin_key', adminKey, 30);
}

export function clearAdminToken() {
  deleteCookie('mg_admin_token');
  deleteCookie('mg_admin_key');
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = {
  inr: (n: number | string | null | undefined): string =>
    `₹${parseFloat(String(n ?? 0)).toLocaleString('en-IN')}`,

  date: (d: string | null | undefined): string =>
    d
      ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '—',

  ago: (d: string | null | undefined): string => {
    if (!d) return '—';
    const hrs  = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : fmt.date(d);
  },
};
