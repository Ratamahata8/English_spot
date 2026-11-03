import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/English_spot/',
  plugins: [react(), tailwindcss()],
  test: { include: ['tests/**/*.test.ts'] },
});
