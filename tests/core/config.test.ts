import { describe, expect, it } from 'vitest'
import { createRegistry } from '../../src/core/registry'

describe('plugin registry', () => {
  it('finds the first collector matching a url', () => {
    const registry = createRegistry({
      collectors: [
        { name: 'example', match: (url: URL) => url.hostname === 'example.com' }
      ],
      transformers: [],
      publishers: []
    })

    expect(registry.resolveCollector('https://example.com/post')).toBe('example')
  })
})
