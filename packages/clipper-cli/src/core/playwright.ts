import { chromium } from 'playwright'
import { createPlaywrightClientRunner } from './client.js'

export const runWithPlaywright = createPlaywrightClientRunner({
  async launch() {
    return chromium.launch({ headless: true })
  }
})
