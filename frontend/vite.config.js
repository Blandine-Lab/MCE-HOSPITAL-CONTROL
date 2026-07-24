import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['chart.js', 'react-chartjs-2']
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000'   // seule /api doit aller au backend
    }
  }
})