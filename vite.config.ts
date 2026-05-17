import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2020',
    cssMinify: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/formulas')) {
            return 'engine'
          }
        },
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  },
})
