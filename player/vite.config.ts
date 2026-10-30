import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  build: {
    rollupOptions: {
      // 👇 指定你的主入口 TS 文件路径（如果在根目录就写 './player.ts'，在 src 下就写 './src/player.ts'）
      input: './src/player.ts', 
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