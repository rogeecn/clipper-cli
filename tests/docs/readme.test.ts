import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('readme', () => {
  it('documents the collect command', () => {
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('clipper collect <url>')
  })

  it('documents plugin auto-discovery workflow', () => {
    const readme = readFileSync('README.md', 'utf8')

    expect(readme).toContain('clipper.plugin')
    expect(readme).toContain('file:')
    expect(readme).toContain('workspace')
    expect(readme).toContain('clipper plugins')
  })
})
