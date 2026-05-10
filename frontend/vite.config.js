import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // Changed from '' to '/' for better path resolution on Vercel
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Add your static assets here
      manifest: {
        name: 'Lead CRM V4',
        short_name: 'CRM V4',
        description: 'WebGyor Lead Management System',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // Added this to fix the logo display on Android/iOS
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // ✅ Tell Workbox to cache all JS, CSS, and Images
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html' 
      }
    })
  ],
  build: {
    emptyOutDir: true,
    assetsDir: 'assets',
  }
})