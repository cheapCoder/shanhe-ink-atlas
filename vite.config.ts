import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: '127.0.0.1' },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // 内容数据单独成块：改代码不改内容时，浏览器里已缓存的内容块不必重新下载
        manualChunks: (id) => (/src\/data\/(events|figures)\//.test(id) ? 'content' : undefined),
      },
    },
  },
});
