import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import workspacePkg from '../package.json'
import cliPkg from '../packages/clipper-cli/package.json'
import { describe, expect, it } from 'vitest'

describe('pnpm workspace root', () => {
  it('declares package globs in pnpm-workspace.yaml', () => {
    const workspaceFile = resolve(process.cwd(), 'pnpm-workspace.yaml')

    expect(existsSync(workspaceFile)).toBe(true)

    const workspaceConfig = readFileSync(workspaceFile, 'utf8')

    expect(workspaceConfig).toContain('packages:')
    expect(workspaceConfig).toContain("- 'packages/*'")
  })

  it('uses a workspace-only package name distinct from the publishable cli package', () => {
    expect(workspacePkg.private).toBe(true)
    expect(workspacePkg.name).not.toBe(cliPkg.name)
  })
})
