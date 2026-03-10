import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'

import type {
  ClipperContext,
  ClipperDocument,
  ClipperPlugin,
  CollectorPlugin,
  TransformerPlugin
} from 'clipper-cli'

interface ParsedWeixinArticle {
  meta: Record<string, unknown>
  contentHtml: string
  markdown: string
}

const WEIXIN_BROWSER_HEADERS = {
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
  'Cookie': 'rewardsn=; wxtokenkey=777'
} as const

const WEIXIN_REQUEST_TIMEOUT = 30000

function isWeixinArticleUrl(url: URL): boolean {
  return url.hostname === 'mp.weixin.qq.com' && (url.pathname === '/s' || url.pathname.startsWith('/s/'))
}

function parseWeixinArticle(html = ''): ParsedWeixinArticle | null {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const jsContent = document.getElementById('js_content')

  if (!jsContent || !jsContent.textContent || jsContent.textContent.trim() === '') {
    return null
  }

  document.querySelectorAll('script, link, style').forEach((element) => {
    element.remove()
  })

  const body = document.body
  body.replaceChildren(jsContent)

  const cleanAttributes = (element: Element): void => {
    for (const child of element.children) {
      const src = child.getAttribute('src')
      const dataSrc = child.getAttribute('data-src')
      const href = child.getAttribute('href')

      while (child.attributes.length > 0) {
        child.removeAttribute(child.attributes[0].name)
      }

      if (dataSrc) {
        child.setAttribute('src', dataSrc)
      } else if (src) {
        child.setAttribute('src', src)
      }

      if (href) {
        child.setAttribute('href', href)
      }

      if (child.children.length > 0) {
        cleanAttributes(child)
      }
    }
  }

  cleanAttributes(body)

  const removeEmptyTags = (element: Element): void => {
    const toRemove: Element[] = []

    for (const child of element.children) {
      if (child.children.length > 0) {
        removeEmptyTags(child)
      }

      const isEmpty = !child.textContent || child.textContent.trim() === ''
      const hasNoChildren = child.children.length === 0
      const isNotImage = child.tagName !== 'IMG'

      if (isEmpty && hasNoChildren && isNotImage) {
        toRemove.push(child)
      }
    }

    toRemove.forEach((node) => {
      node.remove()
    })
  }

  removeEmptyTags(body)

  const meta: Record<string, unknown> = {}
  document.querySelectorAll('meta[property^="og:"]').forEach((element) => {
    const property = element.getAttribute('property')
    const content = element.getAttribute('content')

    if (!property || !content) {
      return
    }

    const key = property.replace('og:', '').replace(/:/g, '_')
    if (key !== 'site_name') {
      meta[key] = content
    }
  })

  let contentHtml = body.innerHTML
  const links: Array<{ title: string; link: string }> = []
  const contentDom = new JSDOM(contentHtml)

  contentDom.window.document.querySelectorAll('a[href]').forEach((element) => {
    try {
      const href = element.getAttribute('href')
      const url = new URL(href ?? '', 'https://mp.weixin.qq.com')

      if (isWeixinArticleUrl(url)) {
        links.push({
          title: element.textContent?.trim() ?? '',
          link: url.toString()
        })
      }
    } catch {
      // ignore invalid article links
    }
  })

  meta.links = links

  const turndownService = new TurndownService()

  // remove nbsp space
  contentHtml = contentHtml.replaceAll('&nbsp;', ' ').replaceAll('\u00a0', ' ')

  return {
    meta,
    contentHtml,
    markdown: turndownService.turndown(contentHtml)
  }
}

export const weixinCollector: CollectorPlugin = {
  name: 'weixin',
  match(url) {
    return isWeixinArticleUrl(url)
  },
  buildClientOptions(ctx) {
    return {
      timeout: WEIXIN_REQUEST_TIMEOUT,
      headers: {
        ...WEIXIN_BROWSER_HEADERS,
        Referer: ctx.input.url
      }
    }
  },
  shouldFallback(result) {
    if (result.status !== 200) {
      return true
    }

    return parseWeixinArticle(result.body) === null
  }
}

export const weixinTransformer: TransformerPlugin = {
  name: 'weixin',
  normalizeDocument(ctx) {
    const html = ctx.artifacts.rawHtml ?? ctx.response.body ?? ''
    const article = parseWeixinArticle(html)

    if (!article) {
      throw new Error('Unable to parse Weixin article content')
    }

    return {
      url: ctx.input.url,
      title: typeof article.meta.title === 'string' ? article.meta.title : '',
      excerpt: typeof article.meta.description === 'string' ? article.meta.description : undefined,
      content: {
        html: article.contentHtml,
        markdown: article.markdown
      },
      assets: [],
      meta: {
        image: article.meta.image,
        url: article.meta.url,
        links: article.meta.links
      },
      source: 'weixin',
      tags: []
    }
  }
}

export const plugin: ClipperPlugin = {
  name: 'clipper-plugin-weixin',
  collectors: [weixinCollector],
  transformers: [weixinTransformer],
  publishers: []
}

export default plugin
