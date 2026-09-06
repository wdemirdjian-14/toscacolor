import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ToscaColor',
        short_name: 'ToscaColor',
        description: 'Coloriages pour les enfants. Sans publicité, et sans réseau.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // L'iPad se tient dans les deux sens : on ne force aucune orientation.
        orientation: 'any',
        background_color: '#f4f2f8',
        theme_color: '#f4f2f8',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // Les polices viennent de Google : sans cache, l'appli hors ligne
        // retomberait sur les polices système.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'polices-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'polices',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  build: { target: 'es2020' },
  // Le tag Git est injecté au build : on sait quelle version tourne sur le VPS
  // sans avoir à fouiller, ce qui compte le jour où un cache reste coincé.
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? 'dev'),
  },
})
