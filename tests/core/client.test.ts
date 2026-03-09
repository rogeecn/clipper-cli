import { describe, expect, it } from 'vitest'
import { createPlaywrightClientRunner } from '../../packages/clipper-cli/src/core/client.js'

describe('playwright client runner', () => {
  it('uses collector cdp options and returns page html', async () => {
    const calls: string[] = []

    const runner = createPlaywrightClientRunner({
      launch: async () => ({
        newPage: async () => ({
          goto: async (url: string, options: { waitUntil?: string }) => {
            calls.push(`goto:${url}:${String(options.waitUntil)}`)
          },
          waitForSelector: async (selector: string) => {
            calls.push(`wait:${selector}`)
          },
          content: async () => '<html><body><p>Client HTML</p></body></html>'
        }),
        close: async () => {
          calls.push('browser:close')
        }
      })
    })

    const result = await runner({
      url: 'https://example.com/post',
      waitUntil: 'networkidle',
      waitForSelector: '#app'
    })

    expect(result.html).toContain('Client HTML')
    expect(calls).toEqual([
      'goto:https://example.com/post:networkidle',
      'wait:#app',
      'browser:close'
    ])
  })
})
