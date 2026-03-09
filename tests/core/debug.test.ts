import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { writeDebugArtifacts } from '../../src/core/debug.js'

describe('debug artifacts', () => {
  it('writes request, response, html, document, and screenshot files', async () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'clipper-debug-'))

    const outputDir = await writeDebugArtifacts({
      cwd: rootDir,
      request: { url: 'https://example.com' },
      response: { status: 200 },
      rawHtml: '<html><body>Hello</body></html>',
      cleanedHtml: '<p>Hello</p>',
      document: { title: 'Hello' },
      screenshot: Buffer.from('image-data')
    })

    expect(existsSync(join(outputDir, 'request.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'response.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'raw.html'))).toBe(true)
    expect(existsSync(join(outputDir, 'cleaned.html'))).toBe(true)
    expect(existsSync(join(outputDir, 'document.json'))).toBe(true)
    expect(existsSync(join(outputDir, 'screenshot.png'))).toBe(true)
    expect(readFileSync(join(outputDir, 'document.json'), 'utf8')).toContain('Hello')
  })

  it('does not expose the unused debug artifact factory', async () => {
    const debugModule = await import('../../src/core/debug.js')

    expect('createDebugArtifacts' in debugModule).toBe(false)
  })
})
