import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCollectCommand } from '../../packages/clipper-cli/src/cli/commands/collect.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect debug artifacts', () => {
  it('writes debug files when debug mode is enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-debug-run-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>Debug Title</title></head><body><p>Debug Body</p></body></html>',
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
      publisher: 'markdown',
      debug: true
    })

    expect(result.debugDir).toBeDefined()
    expect(existsSync(join(result.debugDir!, 'request.json'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'response.json'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'raw.html'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'document.json'))).toBe(true)
    expect(readFileSync(join(result.debugDir!, 'document.json'), 'utf8')).toContain('Debug Title')
  })
})
