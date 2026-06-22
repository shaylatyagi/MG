import React from 'react';

// Dark mode has been removed. useTheme always returns light mode.
export function useTheme() {
  // Always remove dark class in case it was set by a previous session
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('mg_theme', 'light');
  }
  return [false, () => {}];
}

export default function ThemeToggle() {
  return null;
}
