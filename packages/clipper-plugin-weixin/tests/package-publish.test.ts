import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

const packageJson = pkg as Record<string, unknown>
const scripts = packageJson.scripts as Record<string, unknown> | undefined
const clipper = packageJson.clipper as Record<string, unknown> | undefined

describe('clipper-plugin-weixin package publish settings', () => {
  it('defines clean build behavior and honest publishable plugin entrypoints', () => {
    expect(packageJson.private).not.toBe(true)
    expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'README.md']))
    expect(packageJson.exports).toMatchObject({
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js'
      }
    })
    expect(packageJson.repository).toBeTruthy()
    expect(packageJson.homepage).toBeTruthy()
    expect(packageJson.bugs).toBeTruthy()
    expect(scripts?.build).toEqual(expect.stringContaining('rmSync'))
    expect(scripts?.build).toEqual(expect.stringContaining('tsc -p tsconfig.build.json'))
    expect(scripts?.test).toEqual(expect.stringContaining('pnpm run build'))
    expect(clipper).toMatchObject({
      plugin: true,
      entry: './dist/index.js'
    })
  })

  it('does not declare npm-incompatible workspace protocol dependencies', () => {
    const dependencySections = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'] as const

    for (const section of dependencySections) {
      const entries = (packageJson[section] as Record<string, string> | undefined) ?? {}
      expect(Object.values(entries).some((value) => value.startsWith('workspace:'))).toBe(false)
    }
  })
})
