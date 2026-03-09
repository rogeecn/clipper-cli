import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

describe('package publish settings', () => {
  it('declares exports, engines, and prepublishOnly', () => {
    expect(pkg.exports).toBeTruthy()
    expect(pkg.engines?.node).toBeTruthy()
    expect(pkg.scripts?.prepublishOnly).toBeTruthy()
  })
})
