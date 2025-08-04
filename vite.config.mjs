import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/public-api.ts'),
      name: 'Datataki',
      fileName: 'datataki',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        format: 'es',
        entryFileNames: 'app.js',
        dir: 'dist/browser',
      },
    },
    target: 'es2022',
    minify: false,
    sourcemap: false,
  },
});