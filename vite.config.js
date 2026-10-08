import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    outDir: 'dist',
    target: 'chrome105',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        display: resolve(__dirname, 'display.html'),
      },
    },
  },
});
