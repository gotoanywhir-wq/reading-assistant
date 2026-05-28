import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/reading-assistant/',
  server: {
    proxy: {
      '/api/mymemory': {
        target: 'https://api.mymemory.translated.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mymemory/, ''),
      },
      '/api/youdao': {
        target: 'https://openapi.youdao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/youdao/, ''),
      },
      '/api/baidu': {
        target: 'https://api.fanyi.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/baidu/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
