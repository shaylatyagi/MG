// frontend/src/api.js
import axios from 'axios';

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const API_URL = isProduction 
  ? 'https://newmg.onrender.com'  // Your deployed backend
  : 'http://localhost:5000';         // Local development

if (!isProduction) console.log(`🔧 API: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!isProduction) console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    if (!isProduction) console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (!isProduction) console.warn('Unauthorized, redirecting...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;