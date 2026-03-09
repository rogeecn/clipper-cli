import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

describe('package bootstrap', () => {
  it('exposes a bin entry for the cli', () => {
    expect(pkg.bin).toHaveProperty('clipper')
  })
})
