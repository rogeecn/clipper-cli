import { describe, expect, it } from 'vitest'
import { obsidianPublisher } from '../../src/publishers/obsidian'

describe('obsidian publisher', () => {
  it('stores assets under an attachments directory', () => {
    const output = obsidianPublisher.resolveOutput({
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

    expect(output.assetDir).toBe('/vault/attachments')
  })
})
