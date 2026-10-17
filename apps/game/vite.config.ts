import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { privateAssetsPlugin } from '../../scripts/private-assets-plugin.ts';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), privateAssetsPlugin(fileURLToPath(new URL('../..', import.meta.url)))],
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/dist-private/**'] },
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
  clearScreen: false,
});
