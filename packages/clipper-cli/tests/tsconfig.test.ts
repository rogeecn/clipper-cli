import tsconfig from '../tsconfig.json'
import { describe, expect, it } from 'vitest'

const packageTsconfig = tsconfig as {
  compilerOptions?: Record<string, unknown>
  include?: unknown
  extends?: unknown
}

describe('clipper-cli package tsconfig', () => {
  it('describes an honest package-local boundary after Task 3 source migration', () => {
    expect(packageTsconfig.extends).toBe('../../tsconfig.base.json')
    expect(packageTsconfig.compilerOptions).toMatchObject({
      noEmit: true
    })
    expect(packageTsconfig.compilerOptions?.outDir).toBeUndefined()
    expect(packageTsconfig.compilerOptions?.rootDir).toBeUndefined()
    expect(packageTsconfig.include).toEqual(['src', 'tests', 'package.json', 'vitest.config.ts'])
  })
})
