import type { ClientOptions } from '../core/client.js'
import type { ClipperContext } from './context.js'
import type { ClipperDocument } from './document.js'
import type { RequestResult } from '../core/request.js'

export interface CollectorPlugin {
  name: string
  match(url: URL): boolean
  shouldFallback?(result: RequestResult, ctx: ClipperContext): boolean
  buildClientOptions?(ctx: ClipperContext): Partial<ClientOptions>
}

export interface TransformerPlugin {
  name: string
  normalizeDocument(ctx: ClipperContext): Promise<ClipperDocument> | ClipperDocument
}

export interface PublisherOutput {
  entryFile: string
  assetDir: string
}

export interface PublisherPlugin {
  name: string
  resolveOutput(ctx: { input: { outputDir?: string }; document: ClipperDocument }): PublisherOutput
  publish?(ctx: { input: { outputDir?: string }; document: ClipperDocument }): Promise<PublisherOutput> | PublisherOutput
}

export interface RuntimeConfig {
  collectors: CollectorPlugin[]
  transformers: TransformerPlugin[]
  publishers: PublisherPlugin[]
}
