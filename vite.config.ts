import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 9442,
    proxy: {
      '/api': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
      '/callback': {
        target: 'http://localhost:9443',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
