import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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

  it('uses the transformer whose name matches the resolved collector', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = mkdtempSync(join(tmpdir(), 'clipper-config-'))

    writeFileSync(join(configDir, 'clipper.config.mjs'), `export default {
  collectors: [{
    name: 'weixin',
    match: (url) => url.hostname === 'mp.weixin.qq.com',
    shouldFallback: () => false
  }],
  transformers: [
    {
      name: 'fallback',
      normalizeDocument: (ctx) => ({
        url: ctx.input.url,
        title: 'Fallback title',
        content: { html: ctx.artifacts.rawHtml, markdown: 'Fallback body' },
        assets: [],
        meta: {},
        source: 'fallback',
        tags: []
      })
    },
    {
      name: 'weixin',
      normalizeDocument: (ctx) => ({
        url: ctx.input.url,
        title: 'Weixin title',
        content: { html: ctx.artifacts.rawHtml, markdown: 'Weixin body' },
        assets: [],
        meta: {},
        source: 'weixin',
        tags: []
      })
    }
  ],
  publishers: []
}`)

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
      url: 'https://mp.weixin.qq.com/s/example',
      output: outputDir,
      cwd: configDir,
      publisher: 'markdown'
    })

    expect(result.collectorName).toBe('weixin')
    expect(result.document.title).toBe('Weixin title')
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('Weixin body')
  })

  it('falls back to the default transformer when the collector-specific transformer is absent', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = mkdtempSync(join(tmpdir(), 'clipper-config-'))

    writeFileSync(join(configDir, 'clipper.config.mjs'), `export default {
  collectors: [{
    name: 'weixin',
    match: (url) => url.hostname === 'mp.weixin.qq.com',
    shouldFallback: () => false
  }],
  transformers: [
    {
      name: 'fallback',
      normalizeDocument: (ctx) => ({
        url: ctx.input.url,
        title: 'Fallback title',
        content: { html: ctx.artifacts.rawHtml, markdown: 'Fallback body' },
        assets: [],
        meta: {},
        source: 'fallback',
        tags: []
      })
    }
  ],
  publishers: []
}`)

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
      url: 'https://mp.weixin.qq.com/s/example',
      output: outputDir,
      cwd: configDir,
      publisher: 'markdown'
    })

    expect(result.collectorName).toBe('weixin')
    expect(result.document.title).toBe('Fallback title')
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('Fallback body')
  })
})
