import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
  VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Lead CRM',
    short_name: 'CRM',
    theme_color: '#0F172A',
    background_color: '#0F172A',
    display: 'standalone',
    icons: [
  {
    src: '/icon-192x192.png',
    sizes: '192x192',
    type: 'image/png'
  },
  {
    src: '/icon-512x512.png',
    sizes: '512x512',
    type: 'image/png'
  }
]
  }
})
  ]
})