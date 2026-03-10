import { createRegistry } from '../../core/registry.js'
import { runPipeline } from '../../core/pipeline.js'
import { performRequest } from '../../core/request.js'
import { fetchHtml } from '../../core/fetcher.js'
import { resolveRuntimeConfig } from '../../core/config.js'
import { runWithPlaywright } from '../../core/playwright.js'
import { writeDebugArtifacts } from '../../core/debug.js'
import { buildDebugDocument } from '../../core/debug-metadata.js'

export interface CollectOptions {
  url: string
  output?: string
  publisher?: string
  config?: string
  cwd?: string
  debug?: boolean
}

export async function runCollectCommand(options: CollectOptions) {
  const runtimeConfig = await resolveRuntimeConfig({ cwd: options.cwd, configPath: options.config })
  const registry = createRegistry(runtimeConfig)
  const collector = registry.resolveCollectorPlugin(options.url)
  const transformer = collector ? registry.resolveTransformer(collector.name) ?? registry.resolveTransformer() : registry.resolveTransformer()
  const publisher = registry.resolvePublisher(options.publisher)

  if (!collector || !transformer || !publisher) {
    throw new Error('Missing runtime plugins')
  }

  const requestOptions = collector.buildClientOptions?.({
    input: {
      url: options.url,
      outputDir: options.output,
      publisher: publisher.name,
      debug: options.debug,
      configPath: options.config
    },
    runtime: {
      debug: options.debug ?? false,
      cwd: options.cwd ?? process.cwd()
    },
    request: {},
    response: {},
    client: {},
    artifacts: {}
  }) ?? {}

  const context = await runPipeline({
    url: options.url,
    outputDir: options.output,
    configPath: options.config,
    debug: options.debug,
    cwd: options.cwd,
    collector,
    requestRunner: () => performRequest({
      url: options.url,
      ...(requestOptions as Record<string, unknown>),
      fetcher: fetchHtml
    }),
    clientRunner: runWithPlaywright,
    transformer,
    publisher
  })

  const document = context.document

  if (!document) {
    throw new Error('Pipeline did not produce a document')
  }

  const output = await publisher.publish?.({
    input: { outputDir: options.output },
    document
  })

  const debugDocument = buildDebugDocument(document, context)

  const debugDir = options.debug
    ? await writeDebugArtifacts({
        cwd: options.cwd ?? process.cwd(),
        request: context.request,
        response: context.response,
        rawHtml: context.artifacts.rawHtml,
        cleanedHtml: context.artifacts.cleanedHtml ?? document.content.html,
        document: debugDocument,
        screenshot: context.artifacts.screenshot
      })
    : undefined

  return {
    collectorName: collector.name,
    document,
    output,
    debugDir
  }
}
