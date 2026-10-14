import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {grokPwaPlugin} from '../scripts/grok-pwa-plugin.mjs';

const root = path.resolve(import.meta.dirname);

export default defineConfig(() => {
  return {
    root,
    plugins: [react(), tailwindcss(), grokPwaPlugin()],
    resolve: {
      alias: {
        '@': root,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
