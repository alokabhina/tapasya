import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// VitePWA — injectManifest mode:
//   - Our custom public/sw.js is used as the SW source
//   - Vite injects the pre-cache manifest (with hashed asset names) at build time
//   - SW file is copied to dist/ with the manifest injected, so hashed JS/CSS are cached
//   - First load must be online; subsequent loads work offline

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',   // use our own sw.js, inject asset manifest
      srcDir: 'public',
      filename: 'sw.js',
      injectRegister: false,          // we register manually in main.jsx
      manifest: false,                // we have our own public/manifest.json
      injectManifest: {
        injectionPoint: undefined,    // we don't use workbox precaching — just cache-first in fetch handler
      },
      devOptions: {
        enabled: false,               // SW disabled in dev to avoid confusion
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
  },
})