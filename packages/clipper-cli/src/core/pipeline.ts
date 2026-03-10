import type { ClientRunner } from './client.js'
import type { RequestResult } from './request.js'
import type { ClipperContext } from '../types/context.js'
import type { CollectorPlugin, PublisherPlugin, TransformerPlugin } from '../types/plugin.js'
import { buildDebugClientFallback, buildDebugPipeline, buildDebugRuntime } from './debug-metadata.js'

interface PipelineInput {
  url: string
  outputDir?: string
  configPath?: string
  debug?: boolean
  cwd?: string
  collector: CollectorPlugin
  requestRunner: () => Promise<RequestResult>
  clientRunner: ClientRunner
  transformer: Pick<TransformerPlugin, 'name' | 'normalizeDocument'>
  publisher: PublisherPlugin | null
}

function createContext(input: PipelineInput): ClipperContext {
  return {
    input: {
      url: input.url,
      outputDir: input.outputDir,
      publisher: input.publisher?.name,
      debug: input.debug,
      configPath: input.configPath
    },
    runtime: { debug: input.debug ?? false, cwd: input.cwd ?? process.cwd() },
    request: {},
    response: {},
    client: {},
    artifacts: {}
  }
}

export async function runPipeline(input: PipelineInput) {
  const ctx = createContext(input)
  const requestResult = await input.requestRunner()

  ctx.request.pipeline = {
    collector: input.collector.name,
    transformer: input.transformer.name,
    publisher: input.publisher?.name
  }
  const runtime = buildDebugRuntime(ctx)
  const pipeline = buildDebugPipeline(ctx)
  const clientFallback = buildDebugClientFallback(ctx)

  ctx.request = {
    ...requestResult.request,
    runtime,
    pipeline,
    clientFallback
  }
  ctx.response = {
    url: requestResult.url,
    status: requestResult.status,
    statusText: requestResult.statusText,
    ok: requestResult.ok,
    redirected: requestResult.redirected,
    headers: requestResult.headers,
    body: requestResult.body,
    runtime,
    pipeline,
    clientFallback,
    content: {
      rawHtmlSource: 'request'
    }
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
    ctx.request.clientFallback = {
      usedFallback: true,
      options
    }
    ctx.response.clientFallback = {
      usedFallback: true,
      options
    }
    ctx.response.content = {
      rawHtmlSource: 'client-fallback'
    }
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
