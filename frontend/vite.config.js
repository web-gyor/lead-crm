import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'script',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
       id: '/',
  start_url: '/',
  name: 'Lead CRM Pro', // This will fix the "frontend" name in the popup
  short_name: 'CRM Pro',
        description: 'Lead Management System for WebGyor Media',

        scope: '/',
        display: 'standalone',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        icons: [
          {
            src: '/icon-192x192.png?v=2026',

            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png?v=2026',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Fix 1: Covers both requirements
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ]
})