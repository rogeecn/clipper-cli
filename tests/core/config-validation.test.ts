import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRuntimeConfig } from '../../packages/clipper-cli/src/core/config.js'

describe('config validation', () => {
  it('throws a coded error when collectors is not an array', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-invalid-config-'))
    const configPath = join(dir, 'clipper.config.mjs')

    writeFileSync(configPath, `export default {
  collectors: 'nope',
  transformers: [],
  publishers: []
}`)

    await expect(resolveRuntimeConfig({ cwd: dir })).rejects.toMatchObject({
      code: 'E_CONFIG_INVALID'
    })
  })
})
