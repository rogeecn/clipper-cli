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

    expect(typeof typedPlugin.collectors[0].buildClientOptions).toBe('undefined')
  })

  it('matches only weixin article urls', () => {
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/s?__biz=fixture-article'))).toBe(true)
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
