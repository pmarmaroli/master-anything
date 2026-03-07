import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // jsxgraph's package.json exports map doesn't expose the CSS file,
      // so we alias it directly to bypass Vite's strict exports resolution.
      'jsxgraph/distrib/jsxgraph.css': path.resolve(
        __dirname,
        'node_modules/jsxgraph/distrib/jsxgraph.css'
      ),
    },
  },
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
