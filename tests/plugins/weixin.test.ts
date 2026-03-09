import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { weixinCollector, weixinTransformer } from '../fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.js'

const fixtureDir = fileURLToPath(new URL('../fixtures/weixin/', import.meta.url))
const articleHtml = readFileSync(new URL('article.html', `file://${fixtureDir}`), 'utf8')
const missingJsContentHtml = readFileSync(new URL('article-missing-js-content.html', `file://${fixtureDir}`), 'utf8')

describe('weixin fixture plugin', () => {
  it('matches only weixin article urls', () => {
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/s?__biz=fixture-article'))).toBe(true)
    expect(weixinCollector.match(new URL('https://mp.weixin.qq.com/mp/profile_ext?action=home'))).toBe(false)
    expect(weixinCollector.match(new URL('https://example.com/s?__biz=fixture-article'))).toBe(false)
  })

  it('falls back for non-200 responses and pages missing js_content', () => {
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
        { status: 200, headers: {}, body: articleHtml },
        {} as never
      )
    ).toBe(false)
  })

  it('normalizes js_content and og metadata into a ClipperDocument', async () => {
    const document = await weixinTransformer.normalizeDocument({
      input: { url: 'https://mp.weixin.qq.com/s/fixture-article' },
      response: { status: 200, headers: {}, body: articleHtml },
      artifacts: { rawHtml: articleHtml }
    } as never)

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
})
