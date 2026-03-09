import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('workspace lockfile', () => {
  it('does not pin clipper-plugin-weixin to a production clipper-cli dependency', () => {
    const lockfile = readFileSync('pnpm-lock.yaml', 'utf8')

    expect(lockfile).toContain('packages/clipper-plugin-weixin:')
    expect(lockfile).not.toContain('packages/clipper-plugin-weixin:\n    dependencies:\n      clipper-cli:')
  })
})
