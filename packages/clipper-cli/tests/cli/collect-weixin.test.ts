import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runCollectCommand } from '../../src/cli/commands/collect.js'

interface DebugRequestArtifact {
  url?: string
  method?: string
  headers?: Record<string, string>
  timeout?: number
}

const fixtureCwd = fileURLToPath(new URL('../../../../tests/fixtures/discovery-app/', import.meta.url))
const articleHtml = readFileSync(new URL('../../../../tests/fixtures/weixin/article.html', import.meta.url), 'utf8')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect command weixin integration', () => {
  it('auto-selects the discovered weixin collector and transformer', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-weixin-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => articleHtml,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://mp.weixin.qq.com/s?__biz=fixture-article',
      cwd: fixtureCwd,
      output: outputDir,
      publisher: 'markdown'
    })

    expect(result.collectorName).toBe('weixin')
    expect(result.document.source).toBe('weixin')
    expect(result.document.content.markdown).toContain('Fixture Heading')
    expect(result.document.meta.links).toEqual([
      {
        title: 'Related article',
        link: 'https://mp.weixin.qq.com/s?__biz=second'
      }
    ])
  })

  it('writes weixin request headers into debug request artifact', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-weixin-debug-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      url: 'https://mp.weixin.qq.com/s?__biz=fixture-article',
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      text: async () => articleHtml,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://mp.weixin.qq.com/s/fixture-article',
      cwd: fixtureCwd,
      output: outputDir,
      publisher: 'markdown',
      debug: true
    })

    const requestArtifactPath = join(result.debugDir!, 'request.json')
    expect(existsSync(requestArtifactPath)).toBe(true)

    const request = JSON.parse(readFileSync(requestArtifactPath, 'utf8')) as DebugRequestArtifact

    expect(request).toMatchObject({
      url: 'https://mp.weixin.qq.com/s/fixture-article',
      method: 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': expect.any(String),
        'Accept': expect.any(String),
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cookie': 'rewardsn=; wxtokenkey=777',
        'Referer': 'https://mp.weixin.qq.com/s/fixture-article'
      }
    })
  })
})
