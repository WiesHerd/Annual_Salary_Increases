import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  root: '.',
  define: {
    __MERITLY_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    /** Avoid publishing full source maps to the CDN; use Sentry upload or similar if you need them. */
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('echarts')) return 'echarts';
          if (id.includes('xlsx')) return 'xlsx';
          if (id.includes('react-querybuilder')) return 'querybuilder';
          if (id.includes('@dnd-kit')) return 'dnd-kit';
          if (id.includes('papaparse')) return 'papaparse';
          /** Keep React in `vendor` to avoid circular chunk edges with other packages. */
          return 'vendor';
        },
      },
    },
  },
});
