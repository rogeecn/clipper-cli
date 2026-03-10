import rootPkgJson from '../package.json'
import clipperCliPkgJson from '../packages/clipper-cli/package.json'
import { describe, expect, it } from 'vitest'

const rootPkg = rootPkgJson as Record<string, unknown>
const clipperCliPkg = clipperCliPkgJson as Record<string, unknown>

describe('workspace root metadata', () => {
  it('declares root-only workspace metadata', () => {
    expect(rootPkg.private).toBe(true)
    expect(rootPkg.packageManager).toMatch(/^pnpm@/)
    expect(rootPkg.repository).toBeTruthy()
  })

  it('publishes the clipper-cli binary name', () => {
    expect(clipperCliPkg.bin).toEqual({
      'clipper-cli': './dist/cli/index.js'
    })
  })
})
