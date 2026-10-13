import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'player.js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
})