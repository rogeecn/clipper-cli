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

  const contentHtml = body.innerHTML
  const links: Array<{ title: string; link: string }> = []
  const contentDom = new JSDOM(contentHtml)

  contentDom.window.document.querySelectorAll('a[href]').forEach((element) => {
    try {
      const href = element.getAttribute('href')
      const url = new URL(href ?? '', 'https://mp.weixin.qq.com')

      if (url.hostname === 'mp.weixin.qq.com' && url.pathname === '/s') {
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

  return {
    meta,
    contentHtml,
    markdown: turndownService.turndown(contentHtml)
  }
}

export const weixinCollector: CollectorPlugin = {
  name: 'weixin',
  match(url) {
    return url.hostname === 'mp.weixin.qq.com' && url.pathname === '/s'
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
