import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Separado do vite.config.ts de propósito: o de desenvolvimento tem proxy para o
// serviço `backend` do Docker, que não interessa aos testes.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    restoreMocks: true,
  },
})
