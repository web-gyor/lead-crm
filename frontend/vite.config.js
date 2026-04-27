import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true
},
  manifest: {
  name: 'Lead CRM Pro',
  short_name: 'CRM Pro',
  description: 'Professional Lead Management System for Agencies', // <--- Add this
  start_url: '/',
  scope: "/",
  display: "standalone",
  theme_color: "#0F172A",
  background_color: "#0F172A",

 icons: [
  {
    src: '/icon-192x192.png?v=4',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any' 
  },
  {
    src: '/icon-512x512.png?v=4',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable' // <--- Add this
  }
]
}
    })
  ]
})