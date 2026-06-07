// apps/web/lib/api.ts — per DevSpec §10.4
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,   // Sends httpOnly cookie automatically
  timeout: 15_000,
});

export default api;

// For Server Components (no Axios — use fetch with server-side token)
export async function serverFetch<T>(path: string): Promise<T> {
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get('mg_token')?.value;
  const res = await fetch(`${process.env.API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  return (await res.json()).data;
}

// Auth helpers
export const saveToken = (token: string) => {
  document.cookie = `mg_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Strict`;
};

export const clearToken = () => {
  document.cookie = 'mg_token=; path=/; max-age=0';
};
