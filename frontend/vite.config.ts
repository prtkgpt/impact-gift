import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Use esbuild for minification (faster than terser)
    minify: 'esbuild',
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['date-fns', 'react-hot-toast', 'react-helmet-async']
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 600,
    // Target modern browsers for smaller bundles
    target: 'es2015'
  },
  // Remove console.log in production
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
});
