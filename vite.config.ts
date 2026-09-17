import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: '/airport-operations-dashboard/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'charts',
              test: /node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor|decimal.js-light)[\\/]/,
              priority: 20,
            },
            { name: 'workspace-vendor', test: /node_modules/, priority: 0 },
          ],
        },
      },
    },
  },
});
