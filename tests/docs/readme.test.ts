import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('readme', () => {
  it('documents the collect command', () => {
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('clipper collect <url>')
  })
})
