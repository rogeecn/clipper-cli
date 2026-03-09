import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRuntimeConfig } from '../../packages/clipper-cli/src/core/config.js'

const fixtureCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname

describe('runtime config resolution', () => {
  it('auto-loads clipper.config.mjs from cwd and merges default plugins', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-runtime-'))
    const configPath = join(dir, 'clipper.config.mjs')

    writeFileSync(configPath, `export default {
  collectors: [{ name: 'custom', match: () => true, shouldFallback: () => false }],
  transformers: [],
  publishers: []
}`)

    const config = await resolveRuntimeConfig({ cwd: dir })

    expect(config.collectors.map((plugin) => plugin.name)).toContain('custom')
    expect(config.collectors.map((plugin) => plugin.name)).toContain('generic')
    expect(config.publishers.map((plugin) => plugin.name)).toContain('markdown')
  })

  it('merges discovered plugins with built-in runtime plugins', async () => {
    const config = await resolveRuntimeConfig({ cwd: fixtureCwd })

    expect(config.publishers.map((plugin) => plugin.name)).toContain('fixture-publisher')
    expect(config.publishers.map((plugin) => plugin.name)).toContain('markdown')
  })
})
