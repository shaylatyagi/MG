/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mg-indigo':      '#4f46e5',
        'mg-indigo-dark': '#4338ca',
        'mg-slate':       '#0f172a',
        'mg-gold':        '#c4965a',
      },
    },
  },
  plugins: [],
};
