// vite.config.js
// FIX: Firebase ke COOP/COEP headers hataaye — Firebase migration complete hai
// GSI (Google Identity Services) ko ye headers ki zaroorat nahi

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/gsi\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'gsi-cache' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // FIX: Firebase COOP/COEP headers hataaye
  // GSI credential flow popup-free hai — ye headers ab zaroorat nahi
  server: {
    port: 5173,
  },
})
