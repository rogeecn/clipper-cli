import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findConfig } from '../../packages/clipper-cli/src/core/config.js'

describe('config discovery', () => {
  it('finds clipper.config.mjs in the working directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-discovery-'))
    const configPath = join(dir, 'clipper.config.mjs')

    writeFileSync(configPath, 'export default {}')

    expect(await findConfig(dir)).toBe(configPath)
  })
})
