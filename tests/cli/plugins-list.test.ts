import { describe, expect, it } from 'vitest'
import { listPlugins } from '../../src/cli/commands/plugins.js'

describe('plugins list command', () => {
  it('returns registered plugin names grouped by type', async () => {
    const result = await listPlugins()

    expect(result.collectors).toContain('generic')
    expect(result.publishers).toContain('markdown')
  })
})
