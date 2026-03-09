import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const packageJson = pkg as Record<string, unknown>
const scripts = packageJson.scripts as Record<string, unknown> | undefined

describe('clipper-cli package publish settings', () => {
  it('defines clean build behavior and publish-facing entrypoints', () => {
    expect(packageJson.private).not.toBe(true)
    expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'README.md']))
    expect(packageJson.repository).toBeTruthy()
    expect(packageJson.homepage).toBeTruthy()
    expect(packageJson.bugs).toBeTruthy()
    expect(packageJson.exports).toMatchObject({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js'
      }
    })
    expect(packageJson.bin).toMatchObject({
      clipper: './dist/cli/index.js'
    })
    expect(scripts?.build).toEqual(expect.stringContaining('rmSync'))
    expect(scripts?.build).toEqual(expect.stringContaining('tsc -p tsconfig.build.json'))
    expect(scripts?.test).toEqual(expect.stringContaining('pnpm --filter clipper-plugin-weixin build'))
    expect(scripts?.test).toEqual(expect.stringContaining('pnpm run build'))
    expect(scripts?.test).toEqual(expect.stringContaining('vitest run --config vitest.config.ts'))
  })
})
