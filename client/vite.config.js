import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Any request to /api/* gets forwarded to the Express backend.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // strip the /api prefix before forwarding: /api/review -> /review
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
