export type WaitUntilOption = 'load' | 'domcontentloaded' | 'networkidle' | 'commit'

export interface ClientOptions {
  url: string
  waitUntil?: WaitUntilOption
  waitForSelector?: string
  [key: string]: unknown
}

export interface ClientResult {
  html: string
  screenshot?: Uint8Array
}

export type ClientRunner = (options: ClientOptions) => Promise<ClientResult>

interface BrowserPage {
  goto(url: string, options: { waitUntil?: WaitUntilOption }): Promise<unknown>
  waitForSelector?(selector: string): Promise<unknown>
  screenshot?(): Promise<Uint8Array>
  content(): Promise<string>
}

interface BrowserInstance {
  newPage(): Promise<BrowserPage>
  close(): Promise<void>
}

interface BrowserLauncher {
  launch(): Promise<BrowserInstance>
}

export function createPlaywrightClientRunner(launcher: BrowserLauncher): ClientRunner {
  return async (options: ClientOptions) => {
    const browser = await launcher.launch()
    const page = await browser.newPage()

    await page.goto(options.url, { waitUntil: options.waitUntil })

    if (options.waitForSelector && page.waitForSelector) {
      await page.waitForSelector(options.waitForSelector)
    }

    const html = await page.content()
    const screenshot = page.screenshot ? await page.screenshot() : undefined
    await browser.close()
    return {
      html,
      screenshot
    }
  }
}
