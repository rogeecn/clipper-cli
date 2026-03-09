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

export interface ClipperPluginManifest {
  packageName: string
  plugin: boolean
  apiVersion: number
  kind?: Array<'collector' | 'transformer' | 'publisher'>
  entry?: string
}

export interface PluginDiagnostic {
  packageName: string
  stage: 'resolve' | 'manifest' | 'import' | 'validate'
  status: 'discovered' | 'loaded' | 'skipped' | 'failed'
  message: string
}

export interface DiscoveredPlugin {
  packageName: string
  packagePath: string
  manifestPath: string
  manifest: ClipperPluginManifest
}

export interface LoadedPluginModule extends RuntimeConfig {
  packageName: string
  pluginName: string
}

export interface PluginDiscoveryResult {
  discovered: DiscoveredPlugin[]
  loaded: LoadedPluginModule[]
  diagnostics: PluginDiagnostic[]
}

export interface RuntimeConfigResolution extends RuntimeConfig {
  diagnostics: PluginDiagnostic[]
}
