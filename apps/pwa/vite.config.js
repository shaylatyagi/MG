import { defineConfig } from 'vite';
import react   from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // StaleWhileRevalidate for wallet — 5 min TTL
        runtimeCaching: [
          {
            urlPattern: /\/api\/driver\/wallet/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'wallet-cache', expiration: { maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: false, // Using public/manifest.json
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      // Forward all /api calls to the backend during local dev.
      // In production VITE_API_URL is set so this proxy is bypassed.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
