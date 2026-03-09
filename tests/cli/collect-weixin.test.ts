import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runCollectCommand } from '../../packages/clipper-cli/src/cli/commands/collect.js'

const fixtureCwd = fileURLToPath(new URL('../fixtures/discovery-app/', import.meta.url))
const articleHtml = readFileSync(new URL('../fixtures/weixin/article.html', import.meta.url), 'utf8')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect command weixin integration', () => {
  it('auto-selects the discovered weixin collector and transformer', async () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'clipper-weixin-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      text: async () => articleHtml,
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://mp.weixin.qq.com/s?__biz=fixture-article',
      cwd: fixtureCwd,
      output: outputDir,
      publisher: 'markdown'
    })

    expect(result.collectorName).toBe('weixin')
    expect(result.document.source).toBe('weixin')
    expect(result.document.content.markdown).toContain('Fixture Heading')
    expect(result.document.meta.links).toEqual([
      {
        title: 'Related article',
        link: 'https://mp.weixin.qq.com/s?__biz=second'
      }
    ])
  })
})
