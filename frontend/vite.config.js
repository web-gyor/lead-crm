import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // Load environment configurations from your local files
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000', // Keeps your local development running smoothly
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path // Ensures pathing parameters aren't mangled
        },
        '/auth': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto', // 🚀 CRITICAL FOR PWA: Auto-injects service workers into your index.html build file
        includeAssets: ['favicon.ico', 'icon-192x192.png', 'icon-512x512.png', 'robots.txt'],
        manifest: {
          name: 'Lead CRM Management System',
          short_name: 'LeadCRM',
          description: 'High-availability operational agency lead routing platform',
          theme_color: '#1d4ed8', // Tailored matching template branding
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable' // 🚀 CRITICAL FOR PWA: Makes app installation icons looking clean on Android/iOS
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'], // Caches fonts for offline operation
          navigateFallback: '/index.html', // 🚀 CRITICAL FOR VERCEL SPA ROUTING: Prevents 404 page routing crashes on refreshes
          runtimeCaching: [
            {
              // Forces assets to fetch cleanly while caching local images
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'external-images-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        }
      })
    ],
    build: {
      emptyOutDir: true,
      assetsDir: 'assets',
    }
  }
})