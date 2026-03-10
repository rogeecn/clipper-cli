import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('readme', () => {
  it('documents the collect command', () => {
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('clipper-cli collect <url>')
    expect(readme).toContain('clipper-cli publish <input>')
  })

  it('documents plugin auto-discovery workflow', () => {
    const readme = readFileSync('README.md', 'utf8')

    expect(readme).toContain('clipper.plugin')
    expect(readme).toContain('file:')
    expect(readme).toContain('workspace')
    expect(readme).toContain('clipper-cli plugins')
  })

  it('documents the weixin plugin workflow', () => {
    const readme = readFileSync('README.md', 'utf8')

    expect(readme).toContain('clipper-plugin-weixin')
    expect(readme).toContain('与当前 `collector` 同名的 `transformer`')
    expect(readme).toContain('mp.weixin.qq.com/s')
    expect(readme).toContain('fetch.js')
  })
})
