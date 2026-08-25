import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
