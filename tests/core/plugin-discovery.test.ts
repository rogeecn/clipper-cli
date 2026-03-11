import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { discoverPlugins } from '../../packages/clipper-cli/src/core/config.js'

const fixtureCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname
const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname
const workspaceWeixinPath = fileURLToPath(new URL('../../packages/clipper-plugin-weixin', import.meta.url))

describe('plugin discovery', () => {
  it('discovers manifest-based plugin candidates from project dependencies', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd })

    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-local')
    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-weixin')
  })

  it('loads the workspace clipper-plugin-weixin module with weixin collector and transformer contributions', async () => {
    const result = await discoverPlugins({ cwd: fixtureCwd, load: true })
    const weixinManifest = result.discovered.find((plugin) => plugin.packageName === 'clipper-plugin-weixin')
    const weixinPlugin = result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-weixin')

    expect(weixinManifest?.packagePath).toBe(workspaceWeixinPath)
    expect(weixinPlugin?.pluginName).toBe('clipper-plugin-weixin')
    expect(weixinPlugin?.collectors.map((item) => item.name)).toContain('weixin')
    expect(weixinPlugin?.transformers.map((item) => item.name)).toContain('weixin')
  })

  it('records diagnostics for invalid plugin modules without throwing', async () => {
    const result = await discoverPlugins({ cwd: fixtureBrokenCwd, load: true })

    expect(result.diagnostics.some((item) => item.packageName === 'clipper-plugin-broken' && item.status === 'failed')).toBe(true)
  })

  it('discovers a project-level linked clipper-plugin-weixin dependency from node_modules', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'clipper-linked-plugin-'))
    const linkedModulesDir = join(projectDir, 'node_modules')
    const linkedPluginPath = join(linkedModulesDir, 'clipper-plugin-weixin')

    mkdirSync(linkedModulesDir, { recursive: true })
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
      name: 'linked-plugin-app',
      private: true,
      dependencies: {
        'clipper-plugin-weixin': '^0.1.0'
      }
    }, null, 2))
    symlinkSync(workspaceWeixinPath, linkedPluginPath, 'dir')

    const result = await discoverPlugins({ cwd: projectDir })
    const weixinPlugin = result.discovered.find((plugin) => plugin.packageName === 'clipper-plugin-weixin')

    expect(weixinPlugin?.packagePath).toBe(workspaceWeixinPath)
    expect(result.discovered.map((plugin) => plugin.packageName)).toContain('clipper-plugin-weixin')
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

  it('discovers the plugin when cwd is the plugin package root itself', async () => {
    const result = await discoverPlugins({ cwd: workspaceWeixinPath })

    expect(result.discovered.map((p) => p.packageName)).toContain('clipper-plugin-weixin')
  })

  it('loads collectors and transformers when cwd is the plugin package root', async () => {
    const result = await discoverPlugins({ cwd: workspaceWeixinPath, load: true })
    const weixinPlugin = result.loaded.find((p) => p.packageName === 'clipper-plugin-weixin')

    expect(weixinPlugin?.collectors.map((c) => c.name)).toContain('weixin')
    expect(weixinPlugin?.transformers.map((t) => t.name)).toContain('weixin')
  })
})
