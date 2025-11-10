import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  base: '/', // Use absolute paths for Vercel
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Don't inline any assets - keep them as separate files
    assetsInlineLimit: 0,
  },
  server: {
    port: 3000,
  }
})