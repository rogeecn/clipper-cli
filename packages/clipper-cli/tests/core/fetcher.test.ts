import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchHtml } from '../../src/core/fetcher.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchHtml', () => {
  it('attaches a proxy dispatcher when proxy is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      url: 'https://example.com/post',
      status: 200,
      statusText: 'OK',
      ok: true,
      redirected: false,
      text: async () => '<html></html>',
      headers: {
        forEach(callback: (value: string, key: string) => void) {
          callback('text/html', 'content-type')
        }
      }
    })

    vi.stubGlobal('fetch', fetchMock)

    await fetchHtml({
      url: 'https://example.com/post',
      method: 'GET',
      proxy: 'http://127.0.0.1:7890'
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/post',
      expect.objectContaining({
        dispatcher: expect.any(Object)
      })
    )
  })
})
