/**
 * api.ts — Typed Axios instance for MobilityGrid
 *
 * Usage:
 *   import api from './api';
 *   const { data } = await api.get<Driver[]>('/api/owner/drivers');
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// REACT_APP_API_URL must be set in .env / Vercel env vars.
const API_URL: string = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const isDev: boolean  = process.env.NODE_ENV !== 'production';

if (isDev) console.log(`API: ${API_URL}`);

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token') || localStorage.getItem('mg_admin_token');
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    if (isDev) console.log(`${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — handle 401 globally ───────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('mg_admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Typed helper — wraps api.get for common patterns ─────────────────────────
export async function apiGet<T>(url: string): Promise<T> {
  const { data } = await api.get<T>(url);
  return data;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const { data } = await api.post<T>(url, body);
  return data;
}

export default api;
