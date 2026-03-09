import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

const rootPkg = pkg as Record<string, unknown>

describe('root package role', () => {
  it('acts as a workspace coordinator instead of a runnable package', () => {
    expect(rootPkg.private).toBe(true)
    expect(rootPkg.bin).toBeUndefined()
  })
})
