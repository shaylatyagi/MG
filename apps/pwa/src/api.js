// src/api.js — per DevSpec §9.3
import axios from 'axios';

// Dev:  VITE_API_URL unset → baseURL='' → Vite proxy forwards /api/* to localhost:5000
// Prod: set VITE_API_URL=https://your-backend.com in deployment environment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('mg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mg_token');
      localStorage.removeItem('mg_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
