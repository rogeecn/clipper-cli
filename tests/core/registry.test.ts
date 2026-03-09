import { describe, expect, it } from 'vitest'
import { createRegistry } from '../../packages/clipper-cli/src/core/registry.js'

describe('registry transformer resolution', () => {
  it('resolves a transformer by exact name', () => {
    const registry = createRegistry({
      collectors: [],
      transformers: [
        { name: 'fallback', normalizeDocument: () => { throw new Error('not used') } },
        { name: 'weixin', normalizeDocument: () => { throw new Error('not used') } }
      ],
      publishers: []
    })

    expect(registry.resolveTransformer('weixin')?.name).toBe('weixin')
  })

  it('returns undefined for an unknown transformer name', () => {
    const registry = createRegistry({
      collectors: [],
      transformers: [
        { name: 'fallback', normalizeDocument: () => { throw new Error('not used') } },
        { name: 'weixin', normalizeDocument: () => { throw new Error('not used') } }
      ],
      publishers: []
    })

    expect(registry.resolveTransformer('missing')).toBeUndefined()
  })
})
