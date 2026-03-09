import { describe, expect, it } from 'vitest'
import { performRequest } from '../../src/core/request'

describe('request runtime', () => {
  it('normalizes an html response into response context', async () => {
    const response = await performRequest({
      url: 'https://example.com',
      fetcher: async () => ({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: '<html><body>Hello</body></html>'
      })
    })

    expect(response.status).toBe(200)
    expect(response.body).toContain('Hello')
  })
})
