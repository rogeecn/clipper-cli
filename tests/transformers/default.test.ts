import { describe, expect, it } from 'vitest'
import { defaultTransformer } from '../../src/transformers/default'

describe('default transformer', () => {
  it('extracts title and markdown from html', async () => {
    const document = await defaultTransformer.normalizeDocument({
      input: { url: 'https://example.com' },
      artifacts: { rawHtml: '<html><head><title>Hello</title></head><body><h1>Hello</h1><p>World</p></body></html>' }
    } as never)

    expect(document.title).toBe('Hello')
    expect(document.content.markdown).toContain('World')
  })
})
