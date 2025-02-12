const { resolve } = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  base: '/scsn/hobcawbelle/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
  },
  optimizeDeps: {
    include: ['seisplotjs'],
  },
})
