import { mkdtempSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCollectCommand } from '../../packages/clipper-cli/src/cli/commands/collect.js'

interface DebugRequestArtifact {
  url: string
  method?: string
  runtime?: {
    cwd?: string
    debug?: boolean
    input?: {
      url?: string
      outputDir?: string
      publisher?: string
      configPath?: string
    }
  }
  pipeline?: {
    collector?: string
    transformer?: string
    publisher?: string
  }
  clientFallback?: {
    usedFallback?: boolean
    options?: Record<string, unknown>
  }
}

interface DebugResponseArtifact {
  url?: string
  status?: number
  statusText?: string
  ok?: boolean
  redirected?: boolean
  headers?: Record<string, string>
  body?: string
  runtime?: {
    cwd?: string
    debug?: boolean
  }
  pipeline?: {
    collector?: string
    transformer?: string
    publisher?: string
  }
  clientFallback?: {
    usedFallback?: boolean
    options?: Record<string, unknown>
  }
  content?: {
    rawHtmlSource?: string
  }
}

interface DebugDocumentArtifact {
  title?: string
  runtime?: {
    cwd?: string
    debug?: boolean
  }
  pipeline?: {
    collector?: string
    transformer?: string
    publisher?: string
  }
  clientFallback?: {
    usedFallback?: boolean
    options?: Record<string, unknown>
  }
  requestSummary?: {
    url?: string
    method?: string
    headerKeys?: string[]
    timeout?: number
  }
  responseSummary?: {
    url?: string
    status?: number
    statusText?: string
    ok?: boolean
    redirected?: boolean
    headerKeys?: string[]
    rawHtmlSource?: string
  }
  diagnostics?: {
    debug?: {
      runtime?: {
        cwd?: string
        debug?: boolean
      }
      pipeline?: {
        collector?: string
        transformer?: string
        publisher?: string
      }
      clientFallback?: {
        usedFallback?: boolean
        options?: Record<string, unknown>
      }
      requestSummary?: {
        url?: string
        method?: string
        headerKeys?: string[]
        timeout?: number
      }
      responseSummary?: {
        url?: string
        status?: number
        statusText?: string
        ok?: boolean
        redirected?: boolean
        headerKeys?: string[]
        rawHtmlSource?: string
      }
    }
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collect debug artifacts', () => {
  it('writes debug files when debug mode is enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'clipper-debug-run-'))

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      url: 'https://example.com/post',
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      text: async () => '<html><head><title>Debug Title</title></head><body><p>Debug Body</p></body></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    }))

    const result = await runCollectCommand({
      url: 'https://example.com/post',
      output: dir,
      cwd: dir,
      publisher: 'markdown',
      debug: true
    })

    expect(result.debugDir).toBeDefined()
    expect(existsSync(join(result.debugDir!, 'request.json'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'response.json'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'raw.html'))).toBe(true)
    expect(existsSync(join(result.debugDir!, 'document.json'))).toBe(true)

    const request = JSON.parse(readFileSync(join(result.debugDir!, 'request.json'), 'utf8')) as DebugRequestArtifact
    const response = JSON.parse(readFileSync(join(result.debugDir!, 'response.json'), 'utf8')) as DebugResponseArtifact
    const document = JSON.parse(readFileSync(join(result.debugDir!, 'document.json'), 'utf8')) as DebugDocumentArtifact

    expect(request).toMatchObject({
      url: 'https://example.com/post',
      method: 'GET',
      runtime: {
        cwd: dir,
        debug: true,
        input: {
          url: 'https://example.com/post',
          outputDir: dir,
          publisher: 'markdown'
        }
      },
      pipeline: {
        collector: 'generic',
        transformer: 'default',
        publisher: 'markdown'
      },
      clientFallback: {
        usedFallback: false
      }
    })
    expect(response).toMatchObject({
      url: 'https://example.com/post',
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      headers: {
        'content-type': 'text/html'
      },
      runtime: {
        cwd: dir,
        debug: true
      },
      pipeline: {
        collector: 'generic',
        transformer: 'default',
        publisher: 'markdown'
      },
      clientFallback: {
        usedFallback: false
      },
      content: {
        rawHtmlSource: 'request'
      }
    })
    expect(response.body).toContain('Debug Title')
    expect(document).toMatchObject({
      title: 'Debug Title',
      runtime: {
        cwd: dir,
        debug: true
      },
      pipeline: {
        collector: 'generic',
        transformer: 'default',
        publisher: 'markdown'
      },
      clientFallback: {
        usedFallback: false
      },
      requestSummary: {
        url: 'https://example.com/post',
        method: 'GET'
      },
      responseSummary: {
        url: 'https://example.com/post',
        status: 200,
        statusText: 'OK',
        ok: true,
        redirected: false,
        rawHtmlSource: 'request'
      },
      diagnostics: {
        debug: {
          runtime: {
            cwd: dir,
            debug: true
          },
          pipeline: {
            collector: 'generic',
            transformer: 'default',
            publisher: 'markdown'
          },
          clientFallback: {
            usedFallback: false
          },
          requestSummary: {
            url: 'https://example.com/post',
            method: 'GET'
          },
          responseSummary: {
            url: 'https://example.com/post',
            status: 200,
            statusText: 'OK',
            ok: true,
            redirected: false,
            rawHtmlSource: 'request'
          }
        }
      }
    })
    expect(document.requestSummary?.headerKeys).toEqual([])
    expect(document.responseSummary?.headerKeys).toEqual(['content-type'])

    expect(document.runtime).toEqual(request.runtime)
    expect(document.pipeline).toEqual(request.pipeline)
    expect(document.clientFallback).toEqual(request.clientFallback)
    expect(document.runtime).toEqual(response.runtime)
    expect(document.pipeline).toEqual(response.pipeline)
    expect(document.clientFallback).toEqual(response.clientFallback)
    expect(document.diagnostics?.debug?.runtime).toEqual(document.runtime)
    expect(document.diagnostics?.debug?.pipeline).toEqual(document.pipeline)
    expect(document.diagnostics?.debug?.clientFallback).toEqual(document.clientFallback)
  })
})
