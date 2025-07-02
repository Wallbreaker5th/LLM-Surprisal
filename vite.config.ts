import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        // {
        //   src: 'node_modules/@huggingface/transformers/dist/wasm/*.wasm',
        //   dest: 'wasm'
        // }
      ]
    })
  ],
  optimizeDeps: {
    exclude: ['@huggingface/transformers']
  },
  worker: {
    format: 'es',
    plugins: () => []
  }
})
