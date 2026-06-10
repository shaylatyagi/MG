import React, { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // localStorage is authoritative; fall back to current DOM class
    const saved = localStorage.getItem('mg_theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mg_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mg_theme', 'light');
    }
  }, [isDark]);

  return [isDark, () => setIsDark(p => !p)];
}

export default function ThemeToggle({ className = '' }) {
  const [isDark, toggle] = useTheme();
  return (
    <button
      onClick={toggle}
      className={`mg-theme-toggle p-2 rounded-xl flex items-center justify-center ${
        isDark
          ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-yellow-300'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
      } ${className}`}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
      aria-label="Toggle theme"
    >
      <span className="text-base leading-none select-none">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
}
