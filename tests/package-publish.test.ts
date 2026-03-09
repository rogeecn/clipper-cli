import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const rootPkg = pkg as Record<string, unknown>
const scripts = rootPkg.scripts as Record<string, unknown> | undefined

describe('workspace root publish settings', () => {
  it('does not expose publishable package entrypoints', () => {
    expect(rootPkg.private).toBe(true)
    expect(rootPkg.exports).toBeUndefined()
    expect(rootPkg.files).toBeUndefined()
    expect(scripts?.prepublishOnly).toBeUndefined()
  })

  it('builds workspace packages before running root tests', () => {
    expect(scripts?.test).toEqual(expect.stringContaining('pnpm -r build'))
  })
})
