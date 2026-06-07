const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://mg-qw5s.onrender.com';

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
