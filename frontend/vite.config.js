import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      devOptions: { 
        enabled: true,
        type: 'module' 
      },

      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png', 'icon-512-maskable.png'],

      manifest: {
        id: '/lead-crm-v3/',
        name: 'Lead CRM Pro V3',
        short_name: 'CRM V3',
        description: 'Lead Management System for WebGyor Media',
        start_url: '/', 
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#02302d',   
        background_color: '#02302d', 
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      workbox: {
        // ONLY verified Workbox properties allowed here
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html'
      }
    })
  ],
  // This solves the 500kB chunk warning you saw in the logs
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'recharts']
        }
      }
    }
  }
})