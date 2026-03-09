import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCli } from '../../src/cli/index.js'

const fixtureBrokenCwd = new URL('../fixtures/discovery-broken-app', import.meta.url).pathname

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

  it('supports verbose plugin diagnostics from the CLI command', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const previousCwd = process.cwd()

    process.chdir(fixtureBrokenCwd)

    try {
      const program = buildCli()
      await program.parseAsync(['plugins', '--verbose'], { from: 'user' })
    } finally {
      process.chdir(previousCwd)
    }

    expect(writeSpy).toHaveBeenCalled()
    expect(writeSpy.mock.calls.map((call) => String(call[0])).join('')).toContain('clipper-plugin-broken')
  })
})
