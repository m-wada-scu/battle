import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/watch': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/trigger': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/threads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
