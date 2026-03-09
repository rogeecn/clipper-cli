import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

describe('package metadata', () => {
  it('is ready for npm publishing', () => {
    expect(pkg.private).not.toBe(true)
    expect(pkg.description).toBeTruthy()
    expect(pkg.license).toBeTruthy()
    expect(pkg.keywords?.length).toBeGreaterThan(0)
    expect(pkg.repository).toBeTruthy()
  })
})
