import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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
    const configDir = createConfigDir()

    stubHtmlFetch('<html><head><title>Hello</title></head><body><p>World</p></body></html>')

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: outputDir,
      cwd: configDir,
      format: 'markdown'
    })

    expect(result.document.title).toBe('Hello')
    expect(result.output?.entryFile).toBeDefined()
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('World')
  })

  it('writes markdown to stdout when output is omitted', async () => {
    const configDir = createConfigDir()
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    stubHtmlFetch('<html><head><title>Hello</title></head><body><p>World</p></body></html>')

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      cwd: configDir,
      format: 'markdown'
    })

    expect(result.output).toBeUndefined()
    expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('World'))
  })

  it('writes json to stdout when output is omitted', async () => {
    const configDir = createConfigDir()
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    stubHtmlFetch('<html><head><title>Hello</title></head><body><p>World</p></body></html>')

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      cwd: configDir,
      format: 'json'
    })

    expect(result.output).toBeUndefined()
    expect(stdoutWrite).toHaveBeenCalledWith(JSON.stringify(result.document))
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
      format: 'markdown'
    })

    expect(result.collectorName).toBe('weixin')
    expect(result.document.title).toBe('Weixin title')
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('Weixin body')
  })

  it('writes json to disk when json format is requested with output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = createConfigDir()

    stubHtmlFetch('<html><head><title>Hello</title></head><body><p>World</p></body></html>')

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: outputDir,
      cwd: configDir,
      format: 'json'
    })

    expect(result.output?.entryFile.endsWith('.json')).toBe(true)
    expect(JSON.parse(readFileSync(result.output!.entryFile, 'utf8'))).toMatchObject({
      title: 'Hello',
      content: {
        markdown: 'World'
      }
    })
  })

  it('downloads static assets when assets mode is enabled for file output', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = createConfigDir([
      {
        url: 'https://cdn.example.com/cover.png',
        filename: 'cover.png'
      }
    ])

    stubFetchWithAssets({
      html: '<html><head><title>Hello</title></head><body><p>World</p></body></html>',
      assets: {
        'https://cdn.example.com/cover.png': 'asset-binary'
      }
    })

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: outputDir,
      cwd: configDir,
      format: 'markdown',
      assets: true
    })

    expect(existsSync(join(result.output!.assetDir, 'cover.png'))).toBe(true)
    expect(readFileSync(join(result.output!.assetDir, 'cover.png'), 'utf8')).toBe('asset-binary')
  })

  it('skips static asset downloads when writing to stdout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><head><title>Hello</title></head><body><p>World</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    })
    const configDir = createConfigDir([
      {
        url: 'https://cdn.example.com/cover.png',
        filename: 'cover.png'
      }
    ])

    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)

    await runCollectCommand({
      url: 'https://example.com/post',
      cwd: configDir,
      format: 'json',
      assets: true
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/post',
      expect.any(Object)
    )
  })

  it('warns and continues when an asset download fails', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = createConfigDir([
      {
        url: 'https://cdn.example.com/missing.png',
        filename: 'missing.png'
      }
    ])
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url === 'https://cdn.example.com/missing.png') {
        return {
          ok: false,
          status: 404,
          arrayBuffer: async () => Buffer.from('not-found')
        }
      }

      return {
        url,
        status: 200,
        statusText: 'OK',
        ok: true,
        redirected: false,
        text: async () => '<html><head><title>Hello</title></head><body><p>World</p></body></html>',
        headers: {
          forEach(callback: (value: string, key: string) => void) {
            callback('text/html', 'content-type')
          }
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: outputDir,
      cwd: configDir,
      format: 'markdown',
      assets: true
    })

    expect(result.output?.entryFile).toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to download asset https://cdn.example.com/missing.png')
    )
  })

  it('falls back to the default transformer when the collector-specific transformer is absent', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-'))
    const configDir = mkdtempSync(join(tmpdir(), 'clipper-config-'))

    writeFileSync(join(configDir, 'clipper.config.mjs'), `export default {
  collectors: [{
    name: 'custom-site',
    match: (url) => url.hostname === 'example.com',
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
      url: 'https://example.com/post',
      output: outputDir,
      cwd: configDir,
      format: 'markdown'
    })

    expect(result.collectorName).toBe('custom-site')
    expect(result.document.title).toBe('Fallback title')
    expect(readFileSync(result.output!.entryFile, 'utf8')).toContain('Fallback body')
  })
})

function stubHtmlFetch(html: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    status: 200,
    text: async () => html,
    headers: {
      forEach(callback: (value: string, key: string) => void) {
        callback('text/html', 'content-type')
      }
    }
  }))
}

function stubFetchWithAssets(input: { html: string; assets: Record<string, string> }) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (url in input.assets) {
      return {
        url,
        status: 200,
        statusText: 'OK',
        ok: true,
        redirected: false,
        arrayBuffer: async () => Buffer.from(input.assets[url]),
        text: async () => input.assets[url],
        headers: {
          forEach(callback: (value: string, key: string) => void) {
            callback('image/png', 'content-type')
          }
        }
      }
    }

    return {
      url,
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      text: async () => input.html,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }
  }))
}

function createConfigDir(assets: Array<{ url: string; filename?: string }> = []) {
  const configDir = mkdtempSync(join(tmpdir(), 'clipper-config-'))

  writeFileSync(join(configDir, 'clipper.config.mjs'), `export default {
  collectors: [{
    name: 'generic',
    match: () => true,
    shouldFallback: () => false
  }],
  transformers: [{
    name: 'default',
    normalizeDocument: (ctx) => ({
      url: ctx.input.url,
      title: 'Hello',
      content: {
        html: ctx.artifacts.rawHtml,
        markdown: 'World'
      },
      assets: ${JSON.stringify(assets)},
      meta: {},
      source: 'default',
      tags: []
    })
  }],
  publishers: []
}`)

  return configDir
}
