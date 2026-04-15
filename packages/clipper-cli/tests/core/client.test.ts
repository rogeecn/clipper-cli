import { describe, expect, it, vi } from 'vitest'

import { createPlaywrightClientRunner } from '../../src/core/client.js'

describe('createPlaywrightClientRunner', () => {
  it('passes proxy settings through to browser launch', async () => {
    const page = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue('<html></html>')
    }
    const browser = {
      newPage: vi.fn().mockResolvedValue(page),
      close: vi.fn().mockResolvedValue(undefined)
    }
    const launcher = {
      launch: vi.fn().mockResolvedValue(browser)
    }

    const run = createPlaywrightClientRunner(launcher)

    await run({
      url: 'https://example.com/post',
      proxy: 'http://127.0.0.1:7890'
    })

    expect(launcher.launch).toHaveBeenCalledWith({
      proxy: {
        server: 'http://127.0.0.1:7890'
      }
    })
  })
})
