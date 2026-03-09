import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCollectCommand } from '../../src/cli/commands/collect.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect command runtime', () => {
  it('collects content and publishes markdown to disk', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>Hello</title></head><body><p>World</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: outputDir,
      publisher: 'markdown'
    })

    expect(result.document.title).toBe('Hello')
    expect(result.output?.entryFile).toBeDefined()
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('World')
  })
})
