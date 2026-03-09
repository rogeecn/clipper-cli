import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('workspace root cleanup contract', () => {
  it('does not keep legacy single-package source directories at the root', () => {
    expect(existsSync(resolve(process.cwd(), 'src'))).toBe(false)
  })

  it('does not keep legacy single-package example directories at the root', () => {
    expect(existsSync(resolve(process.cwd(), 'examples'))).toBe(false)
  })

  it('removes obsolete root package management files', () => {
    expect(existsSync(resolve(process.cwd(), 'package-lock.json'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), '.npmignore'))).toBe(false)
  })

  it('keeps explicit shared workspace configs instead of ambiguous package-era names', () => {
    const sharedTsconfigPath = resolve(process.cwd(), 'tsconfig.base.json')

    expect(existsSync(sharedTsconfigPath)).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'vitest.workspace-root.config.ts'))).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'tsconfig.json'))).toBe(false)
    expect(existsSync(resolve(process.cwd(), 'vitest.config.ts'))).toBe(false)

    const sharedTsconfig = JSON.parse(readFileSync(sharedTsconfigPath, 'utf8')) as {
      compilerOptions?: Record<string, unknown>
      include?: unknown
      outDir?: unknown
      rootDir?: unknown
    }

    expect(sharedTsconfig.include).toBeUndefined()
    expect(sharedTsconfig.compilerOptions?.outDir).toBeUndefined()
    expect(sharedTsconfig.compilerOptions?.rootDir).toBeUndefined()
  })
})
