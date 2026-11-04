import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/English_spot/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/src/textbook/') && id.endsWith('.json')) return 'textbook-content';
          if (id.includes('/src/lessons/') && id.endsWith('.json')) return 'course-content';
        },
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
