import type { ClientRunner } from './client.js'
import type { RequestResult } from './request.js'
import type { ClipperContext } from '../types/context.js'
import type { CollectorPlugin, PublisherPlugin, TransformerPlugin } from '../types/plugin.js'

interface PipelineInput {
  url: string
  collector: CollectorPlugin
  requestRunner: () => Promise<RequestResult>
  clientRunner: ClientRunner
  transformer: Pick<TransformerPlugin, 'name' | 'normalizeDocument'>
  publisher: PublisherPlugin | null
}

function createContext(url: string): ClipperContext {
  return {
    input: { url },
    runtime: { debug: false, cwd: process.cwd() },
    request: {},
    response: {},
    client: {},
    artifacts: {}
  }
}

export async function runPipeline(input: PipelineInput) {
  const ctx = createContext(input.url)
  const requestResult = await input.requestRunner()

  ctx.response = {
    status: requestResult.status,
    headers: requestResult.headers,
    body: requestResult.body
  }
  ctx.artifacts.rawHtml = requestResult.body

  if (input.collector.shouldFallback?.(requestResult, ctx)) {
    const options = {
      url: input.url,
      ...(input.collector.buildClientOptions?.(ctx) ?? {})
    }
    const result = await input.clientRunner(options)
    ctx.client.usedFallback = true
    ctx.client.options = options
    ctx.artifacts.rawHtml = result.html
    if (result.screenshot) {
      ctx.artifacts.screenshot = result.screenshot
      ctx.artifacts.screenshotPath = 'inline-buffer'
    }
  }

  const document = await input.transformer.normalizeDocument(ctx)
  ctx.document = document

  return ctx
}
