import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // Changed from '' to '/' for better path resolution on Vercel
  plugins: [
    react(),
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icon-192x192.png', 'icon-512x512.png'], // Force include these
  manifest: {
    // ... (rest of your config)
    icons: [
      {
        src: '/icon-192x192.png', // Add the leading slash
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,ico}'], // Ensure images are globbed
  }
})
  ],
  build: {
    emptyOutDir: true,
    assetsDir: 'assets',
  }
})