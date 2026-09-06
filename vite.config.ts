import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // L'application enregistre le worker elle-même, pour savoir quand le
      // préchargement est terminé et pouvoir le dire à l'écran.
      injectRegister: null,
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
        // Tout ce dont l'application a besoin est préchargé à l'installation :
        // une fois le premier chargement passé, plus rien n'est demandé au réseau.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
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
