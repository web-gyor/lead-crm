import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      devOptions: { enabled: true },

      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png'],

      manifest: {
        id: '/lead-crm-v3/',
        name: 'Lead CRM Pro V3',
        short_name: 'CRM V3',
        description: 'Lead Management System for WebGyor Media',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})