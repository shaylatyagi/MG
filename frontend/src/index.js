import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n';

// Global session-expiry interceptor
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await _origFetch(...args);
  if (res.status === 401) {
    const clone = res.clone();
    try {
      const data = await clone.json();
      if (data.code === 'SESSION_EXPIRED') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } catch {}
  }
  return res;
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
reportWebVitals();