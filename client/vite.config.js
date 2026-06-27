import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/modes': 'http://localhost:3000',
      '/strictness': 'http://localhost:3000',
      '/review': 'http://localhost:3000',
      '/reviews': 'http://localhost:3000',
      '/debate': 'http://localhost:3000',
    },
    },
  },
)
