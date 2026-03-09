import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import type { TransformerPlugin } from '../types/plugin.js'

const turndownService = new TurndownService()

export const defaultTransformer: TransformerPlugin = {
  name: 'default',
  async normalizeDocument(ctx) {
    const rawHtml = ctx.artifacts.rawHtml ?? ''
    const dom = new JSDOM(rawHtml)
    const title = dom.window.document.title || 'Untitled'
    const body = dom.window.document.body.innerHTML

    return {
      url: ctx.input.url,
      title,
      content: {
        html: body,
        markdown: turndownService.turndown(body)
      },
      assets: [],
      meta: {},
      source: 'default',
      tags: []
    }
  }
}
