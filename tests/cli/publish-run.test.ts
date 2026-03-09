import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runPublishCommand } from '../../packages/clipper-cli/src/cli/commands/publish.js'

describe('publish command runtime', () => {
  it('publishes an existing document json through a file publisher', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-publish-'))
    const inputPath = join(dir, 'document.json')

    writeFileSync(inputPath, JSON.stringify({
      url: 'https://example.com',
      title: 'Saved Doc',
      content: { html: '<p>Hello</p>', markdown: 'Hello' },
      assets: [],
      meta: {},
      source: 'test',
      tags: []
    }))

    const result = await runPublishCommand({
      input: inputPath,
      output: dir,
      publisher: 'markdown'
    })

    expect(readFileSync(result.output.entryFile, 'utf8')).toContain('Hello')
  })
})
