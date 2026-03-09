import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCli } from '../../src/cli/index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cli action binding', () => {
  it('runs collect action and writes markdown output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-cli-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>CLI Hello</title></head><body><p>CLI World</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const program = buildCli()
    await program.parseAsync(['collect', 'https://example.com/post', '--output', outputDir, '--publisher', 'markdown'], { from: 'user' })

    const outputFile = join(outputDir, 'CLI Hello.md')
    expect(readFileSync(outputFile, 'utf8')).toContain('CLI World')
  })

  it('does not expose unused command registration helpers', async () => {
    const collectModule = await import('../../src/cli/commands/collect.js')
    const publishModule = await import('../../src/cli/commands/publish.js')
    const pluginsModule = await import('../../src/cli/commands/plugins.js')

    expect('registerCollectCommand' in collectModule).toBe(false)
    expect('registerPublishCommand' in publishModule).toBe(false)
    expect('registerPluginsCommand' in pluginsModule).toBe(false)
  })
})
