import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin in dev, so the session cookie works without CORS/SameSite tweaks.
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/race_results': 'http://127.0.0.1:3000',
    },
  },
})
