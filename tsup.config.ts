import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'analytics/index': 'src/analytics/index.ts',
      'core/index': 'src/core/index.ts',
    },
    format: ['esm'],
    dts: true,
    clean: true,
    outDir: 'dist',
  },
  {
    entry: { track: 'build/track.iife.ts' },
    format: ['iife'],
    minify: true,
    outDir: 'dist',
  },
])
