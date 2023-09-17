import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@rubickjs/2d', replacement: resolve('./packages/2d/src') },
      { find: '@rubickjs/animation', replacement: resolve('./packages/animation/src') },
      { find: '@rubickjs/assets', replacement: resolve('./packages/assets/src') },
      { find: '@rubickjs/color', replacement: resolve('./packages/color/src') },
      { find: '@rubickjs/core', replacement: resolve('./packages/core/src') },
      { find: '@rubickjs/effect', replacement: resolve('./packages/effect/src') },
      { find: '@rubickjs/input', replacement: resolve('./packages/input/src') },
      { find: '@rubickjs/math', replacement: resolve('./packages/math/src') },
      { find: '@rubickjs/renderer', replacement: resolve('./packages/renderer/src') },
      { find: '@rubickjs/shared', replacement: resolve('./packages/shared/src') },
      { find: 'rubickjs', replacement: resolve('./packages/rubickjs/src') },
    ],
  },
})
