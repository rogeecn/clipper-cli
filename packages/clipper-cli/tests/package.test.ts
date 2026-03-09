import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

const packageJson = pkg as Record<string, unknown>
const bin = packageJson.bin as Record<string, unknown> | string | undefined
const scripts = packageJson.scripts as Record<string, unknown> | undefined

describe('clipper-cli package role', () => {
  it('is publishable and advertises its generated types honestly', () => {
    expect(packageJson.private).not.toBe(true)
    expect(typeof bin).toBe('object')
    expect(bin).toMatchObject({
      clipper: './dist/cli/index.js'
    })
    expect(packageJson.types).toBe('./dist/index.d.ts')
    expect(scripts).toMatchObject({
      test: expect.any(String)
    })
  })
})
