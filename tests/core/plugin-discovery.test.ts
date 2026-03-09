import { describe, expect, it } from 'vitest'
import { discoverPlugins } from '../../src/core/config.js'

const fixtureCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname
const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname

describe('plugin discovery', () => {
  it('discovers manifest-based plugin candidates from project dependencies', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd })

    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-local')
  })

  it('loads a discovered plugin entry and returns publisher contributions', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })

    expect(result.loaded.flatMap((plugin) => plugin.publishers.map((item) => item.name))).toContain('fixture-publisher')
  })

  it('records diagnostics for invalid plugin modules without throwing', async () => {
    const result = await discoverPlugins({ cwd: fixtureBrokenCwd, load: true })

    expect(result.diagnostics.some((item) => item.packageName === 'clipper-plugin-broken' && item.status === 'failed')).toBe(true)
  })

  it('loads plugin entries declared through conditional exports', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })
    const conditionalPlugin = result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-conditional')

    expect(conditionalPlugin?.publishers.map((item) => item.name)).toContain('conditional-publisher')
  })
})
