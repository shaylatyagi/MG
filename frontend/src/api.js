import axios from 'axios';

// frontend/src/api.js (Ya jahan axios instance hai)
const api = axios.create({
  baseURL: 'https://mg-qw5s.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;