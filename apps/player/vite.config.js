import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'chrome 60', 'safari 11', 'ios 11'], // Broad support for Smart TVs (~2017+)
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 Day
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            // Cache Remote Media (Supabase Storage or Others)
            urlPattern: /\.(mp4|webm|jpg|jpeg|png)$/i,
            handler: 'CacheFirst', // Aggressive Caching for Media
            options: {
              cacheName: 'lumen-media-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'LumenDS Player',
        short_name: 'LumenDS',
        description: 'Digital Signage Player',
        theme_color: '#000000',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: './',
  build: {
    target: 'es2015', // Transpile to ES2015 for older engines
    minify: 'terser',
  },
  server: {
    port: 3000,
  },
})
