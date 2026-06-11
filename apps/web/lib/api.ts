const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mg-qw5s.onrender.com';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/; SameSite=Lax';
}

function deleteCookie(name: string) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getCookie('mg_admin_token');
  const adminKey = getCookie('mg_admin_key');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (adminKey) headers['x-admin-key'] = adminKey;

  const res = await fetch(API_BASE + path, { ...options, headers });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg: string = (json && json.error && json.error.message) || (json && json.message) || ('HTTP ' + String(res.status));
    throw new Error(msg);
  }

  return (json.data !== undefined ? json.data : json) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function saveAdminToken(token: string, adminKey?: string) {
  setCookie('mg_admin_token', token, 30);
  if (adminKey) setCookie('mg_admin_key', adminKey, 30);
}

export function clearAdminToken() {
  deleteCookie('mg_admin_token');
  deleteCookie('mg_admin_key');
}

export const fmt = {
  inr: (n: number | string | null | undefined): string => {
    const num = parseFloat(String(n != null ? n : 0));
    return '₹' + num.toLocaleString('en-IN');
  },
  date: (d: string | null | undefined): string =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  ago: (d: string | null | undefined): string => {
    if (!d) return '—';
    const hrs = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    return days < 30 ? days + 'd ago' : fmt.date(d);
  },
};
