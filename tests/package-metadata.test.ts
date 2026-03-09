import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const rootPkg = pkg as Record<string, unknown>

describe('workspace root metadata', () => {
  it('declares root-only workspace metadata', () => {
    expect(rootPkg.private).toBe(true)
    expect(rootPkg.packageManager).toMatch(/^pnpm@/)
    expect(rootPkg.repository).toBeTruthy()
  })
})
