import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// VitePWA hataya — custom sw.js directly public/ se serve hoga
// SW manually register hoga main.jsx se

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})