import { describe, expect, it } from 'vitest'
import { ClipperError } from '../../src/core/errors.js'

describe('clipper error', () => {
  it('stores a stable error code', () => {
    const error = new ClipperError('E_PUBLISH_FAILED', 'publish failed')

    expect(error.code).toBe('E_PUBLISH_FAILED')
    expect(error.message).toBe('publish failed')
  })
})
