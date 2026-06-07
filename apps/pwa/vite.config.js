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
  server: { port: 5173 },
});
