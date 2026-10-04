// Vite+ per-package tasks for @megabyte/contracts (mirrors packages/error-reporter/vite.config.ts).
// `test` runs the full vitest suite (pure-node schemas — no workers pool); `build` emits types.

const ownDist = { pattern: '!dist/**', base: 'package' } as const

const vitestScratch = [
  { pattern: '!**/node_modules/.vite/**', base: 'workspace' },
  { pattern: '!**/node_modules/.vite-temp/**', base: 'workspace' },
] as const

export default {
  run: {
    tasks: {
      build: {
        command: 'tsc',
        input: [{ auto: true }, ownDist],
        output: ['dist/**'],
      },
      test: {
        command: 'vitest run',
        input: [{ auto: true }, ownDist, ...vitestScratch],
        output: [{ auto: true }, ownDist, ...vitestScratch],
      },
    },
  },
}
