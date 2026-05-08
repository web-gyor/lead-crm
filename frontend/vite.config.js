import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      disable: false, 
      manifest: {
        name: 'Lead CRM  V4',
        short_name: 'CRM V4',
        start_url: '.',
        display: 'standalone',
        theme_color: '#0F172A',
        background_color: '#0F172A',
       icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // ✅ THIS PREVENTS THE BUILD CRASH
        globPatterns: [], 
        navigateFallback: null 
      }
    })
  ],
  build: {
    emptyOutDir: true,
    assetsDir: 'assets',
  }
})