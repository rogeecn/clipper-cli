import type { ClipperContext } from '../types/context.js'
import type { ClipperDocument } from '../types/document.js'

export function buildDebugRuntime(context: ClipperContext) {
  return {
    cwd: context.runtime.cwd,
    debug: context.runtime.debug,
    input: {
      url: context.input.url,
      outputDir: context.input.outputDir,
      publisher: context.input.publisher,
      configPath: context.input.configPath
    }
  }
}

export function buildDebugPipeline(context: ClipperContext) {
  return {
    collector: context.request.pipeline?.collector,
    transformer: context.request.pipeline?.transformer,
    publisher: context.request.pipeline?.publisher
  }
}

export function buildDebugClientFallback(context: ClipperContext) {
  return {
    usedFallback: context.client.usedFallback ?? false,
    options: context.client.options
  }
}

export function buildRequestSummary(context: ClipperContext) {
  return {
    url: context.request.url,
    method: context.request.method,
    headerKeys: Object.keys(context.request.headers ?? {}),
    timeout: context.request.timeout
  }
}

export function buildResponseSummary(context: ClipperContext) {
  return {
    url: context.response.url,
    status: context.response.status,
    statusText: context.response.statusText,
    ok: context.response.ok,
    redirected: context.response.redirected,
    headerKeys: Object.keys(context.response.headers ?? {}),
    rawHtmlSource: context.response.content?.rawHtmlSource
  }
}

export function buildDocumentDebugMetadata(context: ClipperContext) {
  const runtime = buildDebugRuntime(context)
  const pipeline = buildDebugPipeline(context)
  const clientFallback = buildDebugClientFallback(context)

  return {
    runtime,
    pipeline,
    clientFallback,
    requestSummary: buildRequestSummary(context),
    responseSummary: buildResponseSummary(context)
  }
}

export function buildDebugDocument(document: ClipperDocument, context: ClipperContext) {
  const debugMetadata = buildDocumentDebugMetadata(context)

  return {
    ...document,
    runtime: debugMetadata.runtime,
    pipeline: debugMetadata.pipeline,
    clientFallback: debugMetadata.clientFallback,
    requestSummary: debugMetadata.requestSummary,
    responseSummary: debugMetadata.responseSummary,
    diagnostics: {
      ...document.diagnostics,
      debug: {
        ...debugMetadata
      }
    }
  }
}
