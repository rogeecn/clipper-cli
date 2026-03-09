import { describe, expect, it } from 'vitest'
import { listPlugins } from '../../packages/clipper-cli/src/cli/commands/plugins.js'

const fixtureCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname
const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname

describe('plugins list command', () => {
  it('returns registered plugin names grouped by type', async () => {
    const result = await listPlugins()

    expect(result.collectors).toContain('generic')
    expect(result.publishers).toContain('markdown')
  })

  it('includes auto-discovered weixin plugin names alongside built-ins', async () => {
    const result = await listPlugins({ cwd: fixtureCwd })

    expect(result.collectors).toContain('weixin')
    expect(result.transformers).toContain('weixin')
    expect(result.publishers).toContain('markdown')
  })

  it('returns plugin diagnostics in verbose mode', async () => {
    const result = await listPlugins({ cwd: fixtureBrokenCwd, verbose: true })

    expect(result.diagnostics.some((item) => item.status === 'failed')).toBe(true)
  })
})
