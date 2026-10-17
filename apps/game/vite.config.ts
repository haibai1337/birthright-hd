import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { gameAssetsPlugin } from '../../scripts/game-assets-plugin.ts';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), gameAssetsPlugin(fileURLToPath(new URL('../..', import.meta.url)))],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
  clearScreen: false,
});
