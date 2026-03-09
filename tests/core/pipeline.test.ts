import { describe, expect, it } from 'vitest'
import { runPipeline } from '../../src/core/pipeline'

describe('pipeline fallback', () => {
  it('uses client fallback when collector requests it', async () => {
    const events: string[] = []

    const context = await runPipeline({
      url: 'https://example.com/post',
      collector: {
        name: 'example',
        match: () => true,
        shouldFallback: () => true,
        buildClientOptions: () => ({ waitUntil: 'networkidle' })
      },
      requestRunner: async () => {
        events.push('request')
        return { status: 403, headers: {}, body: '' }
      },
      clientRunner: async (options) => {
        events.push(`client:${String(options.waitUntil)}`)
        return { html: '<html><body>Client body</body></html>' }
      },
      transformer: {
        name: 'default',
        normalizeDocument: async (ctx) => ({
          url: ctx.input.url,
          title: 'Title',
          content: { html: ctx.artifacts.rawHtml!, markdown: 'Title' },
          assets: [],
          meta: {},
          source: 'default',
          tags: []
        })
      },
      publisher: null
    })

    expect(events).toEqual(['request', 'client:networkidle'])
    expect(context.document?.content.html).toContain('Client body')
  })
})
