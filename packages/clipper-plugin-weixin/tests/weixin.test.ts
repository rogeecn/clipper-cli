import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ClipperPlugin } from 'clipper-cli'
import { describe, expect, it } from 'vitest'

import { plugin, weixinCollector, weixinTransformer } from '../src/index.js'

const fixtureDir = fileURLToPath(new URL('./fixtures/', import.meta.url))
const articleHtml = readFileSync(new URL('article.html', `file://${fixtureDir}`), 'utf8')
const missingJsContentHtml = readFileSync(new URL('article-missing-js-content.html', `file://${fixtureDir}`), 'utf8')
const emptyJsContentHtml = readFileSync(new URL('article-empty-js-content.html', `file://${fixtureDir}`), 'utf8')

describe('clipper-plugin-weixin', () => {
  it('exports a host-compatible plugin shape', () => {
    const typedPlugin: ClipperPlugin = plugin

    expect(typedPlugin).toMatchObject({
      name: 'clipper-plugin-weixin',
      collectors: [expect.objectContaining({ name: 'weixin' })],
      transformers: [expect.objectContaining({ name: 'weixin' })],
      publishers: []
    })

    expect(typeof typedPlugin.collectors[0].buildClientOptions).toBe('function')
  })

  it('builds browser-like request options for weixin article fetches', () => {
    const options = weixinCollector.buildClientOptions?.({
      input: { url: 'https://mp.weixin.qq.com/s?__biz=fixture-article' }
    } as never)

    expect(options).toMatchObject({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-CH-UA': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Priority': 'u=0, i',
        'Cookie': 'rewardsn=; wxtokenkey=777',
        'Referer': 'https://mp.weixin.qq.com/s?__biz=fixture-article'
      }
    })
  })

  it('matches weixin article urls for both query and path forms', () => {
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/s?__biz=fixture-article'))).toBe(true)
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/s/fixture-article'))).toBe(true)
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/mp/profile_ext?action=home'))).toBe(false)
    expect(weixinCollector.match(new URL('https://example.com/s?__biz=fixture-article'))).toBe(false)
  })

  it('falls back for non-200 responses, missing js_content, and empty js_content', () => {
    expect(
      weixinCollector.shouldFallback?.(
        { status: 500, headers: {}, body: articleHtml },
        {} as never
      )
    ).toBe(true)

    expect(
      weixinCollector.shouldFallback?.(
        { status: 200, headers: {}, body: missingJsContentHtml },
        {} as never
      )
    ).toBe(true)

    expect(
      weixinCollector.shouldFallback?.(
        { status: 200, headers: {}, body: emptyJsContentHtml },
        {} as never
      )
    ).toBe(true)

    expect(
      weixinCollector.shouldFallback?.(
        { status: 200, headers: {}, body: articleHtml },
        {} as never
      )
    ).toBe(false)
  })

  it('normalizes js_content and og metadata into a ClipperDocument', async () => {
    const document = await weixinTransformer.normalizeDocument({
      input: { url: 'https://mp.weixin.qq.com/s/fixture-article' },
      runtime: { debug: false, cwd: process.cwd() },
      request: {},
      response: { status: 200, headers: {}, body: articleHtml },
      client: {},
      artifacts: { rawHtml: articleHtml }
    })

    expect(document).toMatchObject({
      url: 'https://mp.weixin.qq.com/s/fixture-article',
      title: 'Weixin Fixture Article',
      excerpt: 'Fixture article excerpt',
      source: 'weixin',
      assets: [],
      tags: []
    })

    expect(document.content.html).toContain('<div>')
    expect(document.content.html).not.toContain('<script')
    expect(document.content.html).toContain('src="https://cdn.example.com/image.jpg"')
    expect(document.content.markdown).toContain('Fixture Heading')
    expect(document.content.markdown).toContain('Related article')

    expect(document.meta).toMatchObject({
      image: 'https://cdn.example.com/cover.jpg',
      url: 'https://mp.weixin.qq.com/s/fixture-article',
      links: [
        {
          title: 'Related article',
          link: 'https://mp.weixin.qq.com/s?__biz=second'
        }
      ]
    })
  })

  it('throws a clear error when asked to normalize invalid weixin html', () => {
    expect(() => weixinTransformer.normalizeDocument({
      input: { url: 'https://mp.weixin.qq.com/s/fixture-article' },
      runtime: { debug: false, cwd: process.cwd() },
      request: {},
      response: { status: 200, headers: {}, body: missingJsContentHtml },
      client: {},
      artifacts: { rawHtml: missingJsContentHtml }
    })).toThrow('Unable to parse Weixin article content')
  })
})
