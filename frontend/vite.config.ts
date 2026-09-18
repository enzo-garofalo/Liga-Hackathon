import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        // Padrão é o nome do serviço no compose. Rodando o Vite fora do
        // container, `backend` não resolve: aponte com VITE_API_PROXY.
        target: process.env.VITE_API_PROXY ?? 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
