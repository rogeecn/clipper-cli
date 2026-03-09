import { describe, expect, it } from 'vitest'
import { createFilePublisher } from '../../src/publishers/file'

describe('file publisher factory', () => {
  it('creates a publisher with a configurable asset directory', () => {
    const publisher = createFilePublisher({
      name: 'notes',
      assetDirName: 'media'
    })

    const output = publisher.resolveOutput({
      input: { outputDir: '/vault', url: 'https://example.com' },
      document: {
        url: 'https://example.com',
        title: 'Hello World',
        content: { html: '<p>Hello</p>', markdown: 'Hello' },
        assets: [],
        meta: {},
        source: 'test',
        tags: []
      }
    } as never)

    expect(publisher.name).toBe('notes')
    expect(output.entryFile).toBe('/vault/Hello World.md')
    expect(output.assetDir).toBe('/vault/media')
  })
})
