import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/preview-assets/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://graph-editor-server:4001',
    },
  },
}))
