// Bundles the API and all its dependencies into one file, so a small server
// only needs Node to run it (no `pnpm install`, no Prisma CLI).
import { build } from 'esbuild'

await build({
  entryPoints: ['src/server.ts'],
  outfile: 'bundle/server.mjs',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
  // Optional native driver that `pg` tries to load; we use the pure-JS client.
  external: ['pg-native'],
  // Bundled CommonJS dependencies expect these globals.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "import { fileURLToPath as __fileURLToPath } from 'node:url';",
      "import { dirname as __pathDirname } from 'node:path';",
      'const require = __createRequire(import.meta.url);',
      'const __filename = __fileURLToPath(import.meta.url);',
      'const __dirname = __pathDirname(__filename);',
    ].join('\n'),
  },
  logLevel: 'info',
})
