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
      modernPolyfills: true,
    }),
  ],
  base: './',
  build: {
    target: ['chrome58', 'ios11'], // Force transpilation of optional chaining (added in Chrome 80)
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html',
        reset: './reset.html',
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015',
    },
  },
  server: {
    port: 3000,
  },
})
