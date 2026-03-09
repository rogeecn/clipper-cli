import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/core/config.js'

describe('config loader', () => {
  it('loads a clipper config module from disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-config-'))
    const configPath = join(dir, 'clipper.config.mjs')

    writeFileSync(configPath, `export default {
  collectors: [{ name: 'custom', match: () => true }],
  transformers: [],
  publishers: []
}`)

    const config = await loadConfig(configPath)

    expect(config.collectors[0]?.name).toBe('custom')
  })
})
