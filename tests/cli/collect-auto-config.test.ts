import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCollectCommand } from '../../packages/clipper-cli/src/cli/commands/collect.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect command auto config', () => {
  it('uses clipper.config.mjs from cwd without explicit path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-auto-config-'))
    writeFileSync(join(dir, 'clipper.config.mjs'), `export default {
  collectors: [{ name: 'custom', match: () => true, shouldFallback: () => false }],
  transformers: [],
  publishers: []
}`)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>Auto Config</title></head><body><p>World</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: dir,
      cwd: dir,
      publisher: 'markdown'
    })

    expect(result.collectorName).toBe('custom')
    expect(result.document.title).toBe('Auto Config')
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('World')
  })
})
