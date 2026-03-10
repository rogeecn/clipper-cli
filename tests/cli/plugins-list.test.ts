import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { listPlugins } from '../../packages/clipper-cli/src/cli/commands/plugins.js'

const fixtureCwd = new URL('../fixtures/discovery-app', import.meta.url).pathname
const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname
const workspaceWeixinPath = fileURLToPath(new URL('../../packages/clipper-plugin-weixin', import.meta.url))

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

  it('includes weixin from a project-level linked plugin dependency', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'clipper-linked-plugin-cli-'))
    const linkedModulesDir = join(projectDir, 'node_modules')
    const linkedPluginPath = join(linkedModulesDir, 'clipper-plugin-weixin')

    mkdirSync(linkedModulesDir, { recursive: true })
    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
      name: 'linked-plugin-cli-app',
      private: true,
      dependencies: {
        'clipper-plugin-weixin': '^0.1.0'
      }
    }, null, 2))
    symlinkSync(workspaceWeixinPath, linkedPluginPath, 'dir')

    const result = await listPlugins({ cwd: projectDir })

    expect(result.collectors).toContain('weixin')
  })
})
