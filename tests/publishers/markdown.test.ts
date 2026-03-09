import { describe, expect, it } from 'vitest'
import { markdownPublisher } from '../../src/publishers/markdown'

describe('markdown publisher', () => {
  it('creates a markdown file path from the document title', () => {
    const output = markdownPublisher.resolveOutput({
      input: { outputDir: '/vault', url: 'https://example.com' },
      document: {
        url: 'https://example.com',
        title: 'Hello World',
        content: { html: '<p>Hello</p>', markdown: 'Hello' },
        assets: [],
        meta: {},
        source: 'test',
        tags: []
      }
    } as never)

    expect(output.entryFile).toBe('/vault/Hello World.md')
  })

  it('stores assets under an assets directory', () => {
    const output = markdownPublisher.resolveOutput({
      input: { outputDir: '/vault', url: 'https://example.com' },
      document: {
        url: 'https://example.com',
        title: 'Hello World',
        content: { html: '<p>Hello</p>', markdown: 'Hello' },
        assets: [],
        meta: {},
        source: 'test',
        tags: []
      }
    } as never)

    expect(output.assetDir).toBe('/vault/assets')
  })
})
