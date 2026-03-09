import { describe, expect, it } from 'vitest'
import type { ClipperDocument } from '../../packages/clipper-cli/src/types/document'
import type { ClipperPluginManifest, PluginDiagnostic } from '../../packages/clipper-cli/src/types/plugin'

describe('document shape', () => {
  it('requires markdown and html content fields', () => {
    const document: ClipperDocument = {
      url: 'https://example.com',
      title: 'Example',
      content: {
        html: '<p>Hello</p>',
        markdown: 'Hello'
      },
      assets: [],
      meta: {},
      source: 'test',
      tags: []
    }

    expect(document.content.markdown).toBe('Hello')
  })
})

describe('plugin discovery types', () => {
  it('supports manifest and diagnostic structures', () => {
    const manifest: ClipperPluginManifest = {
      packageName: 'clipper-plugin-example',
      plugin: true,
      apiVersion: 1,
      kind: ['publisher']
    }

    const diagnostic: PluginDiagnostic = {
      packageName: 'clipper-plugin-example',
      stage: 'manifest',
      status: 'failed',
      message: 'invalid manifest'
    }

    expect(manifest.apiVersion).toBe(1)
    expect(diagnostic.status).toBe('failed')
  })
})
