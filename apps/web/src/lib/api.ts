const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mg-qw5s.onrender.com';

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/mg_admin_token=([^;]+)/);
  return match ? match[1] : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export function saveAdminToken(token: string) {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `mg_admin_token=${token}; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearAdminToken() {
  document.cookie = 'mg_admin_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = {
  inr: (n: number | string | null | undefined) =>
    `₹${parseFloat(String(n || 0)).toLocaleString('en-IN')}`,
  date: (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  ago: (d: string | null | undefined) => {
    if (!d) return '—';
    const hrs = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : fmt.date(d);
  },
};
