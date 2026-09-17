import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The GenLayer Studio RPC does not send CORS headers, so the browser cannot call
// it directly from the dev origin. Proxying it keeps every request same-origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/gl-api': {
        target: 'https://studio.genlayer.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gl-api/, '/api'),
      },
    },
  },
})