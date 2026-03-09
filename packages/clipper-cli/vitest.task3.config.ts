import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root,
  test: {
    include: [
      'tests/cli/collect-run.test.ts',
      'tests/core/plugin-discovery.test.ts',
      'tests/cli/collect-weixin.test.ts'
    ]
  }
})
