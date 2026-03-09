import { describe, expect, it } from 'vitest'
import type { ClipperDocument } from '../../src/types/document'

describe('document shape', () => {
  it('requires markdown and html content fields', () => {
    const document: ClipperDocument = {
      url: 'https://example.com',
      title: 'Example',
      content: {
        html: '<p>Hello</p>',
        markdown: 'Hello'
      },
      assets: [],
      meta: {},
      source: 'test',
      tags: []
    }

    expect(document.content.markdown).toBe('Hello')
  })
})
