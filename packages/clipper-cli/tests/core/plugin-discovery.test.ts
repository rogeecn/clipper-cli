import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { discoverPlugins } from '../../src/core/config.js'

const fixtureCwd = fileURLToPath(new URL('../../../../tests/fixtures/discovery-app/', import.meta.url))
const fixtureBrokenCwd = fileURLToPath(new URL('../../../../tests/fixtures/discovery-broken-app/', import.meta.url))

describe('plugin discovery', () => {
  it('discovers manifest-based plugin candidates from project dependencies', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd })

    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-local')
    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-weixin')
  })

  it('loads the clipper-plugin-weixin module with weixin collector and transformer contributions', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })
    const weixinPlugin = result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-weixin')

    expect(weixinPlugin?.pluginName).toBe('clipper-plugin-weixin')
    expect(weixinPlugin?.collectors.map((item) => item.name)).toContain('weixin')
    expect(weixinPlugin?.transformers.map((item) => item.name)).toContain('weixin')
  })

  it('records diagnostics for invalid plugin modules without throwing', async () => {
    const result = await discoverPlugins({ cwd: fixtureBrokenCwd, load: true })

    expect(result.diagnostics.some((item) => item.packageName === 'clipper-plugin-broken' && item.status === 'failed')).toBe(true)
  })

  it('loads the local fixture plugin publisher contribution', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })
    const localPlugin = result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-local')

    expect(localPlugin?.pluginName).toBe('clipper-plugin-local')
    expect(localPlugin?.publishers.map((item) => item.name)).toContain('fixture-publisher')
  })

  it('loads plugin entries declared through conditional exports', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })
    const conditionalPlugin = result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-conditional')

    expect(conditionalPlugin?.pluginName).toBe('clipper-plugin-conditional')
    expect(conditionalPlugin?.publishers.map((item) => item.name)).toContain('conditional-publisher')
  })
})
