import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Optimize chunk size
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'supabase-vendor': ['@supabase/supabase-js'],
            }
          }
        },
        // Target modern browsers for better performance
        target: 'esnext',
        // Enable minification
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: ['log'], // Remove console.log but keep console.error/warn
          }
        },
        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
      },
      // CSS code splitting
      css: {
        devSourcemap: mode === 'development',
      }
    };
});
