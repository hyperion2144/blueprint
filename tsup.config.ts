import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  outDir: 'bin',
  dts: true,
  clean: true,
  publicDir: 'src/public',
  banner: {
    js: '#!/usr/bin/env node',
  },
  target: 'es2022',
});
