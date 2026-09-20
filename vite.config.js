import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Proxying the GenLayer RPC through the dev server keeps every request
// same-origin and avoids any CORS surprises from the browser.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/gl-api': {
        target: 'https://studio-dev.genlayer.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gl-api/, '/api'),
      },
    },
  },
})