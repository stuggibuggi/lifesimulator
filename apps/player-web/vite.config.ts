import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@goal/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@goal/simulation-engine': path.resolve(__dirname, '../../packages/simulation-engine/src/index.ts'),
      '@goal/game-content': path.resolve(__dirname, '../../packages/game-content/src/index.ts'),
      '@goal/scoring-engine': path.resolve(__dirname, '../../packages/scoring-engine/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
