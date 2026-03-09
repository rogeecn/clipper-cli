import type { ClipperDocument } from './document.js'

export interface ClipperInput {
  url: string
  outputDir?: string
  publisher?: string
  plugin?: string
  debug?: boolean
  format?: 'md' | 'json'
  fallback?: 'client'
  configPath?: string
}

export interface ClipperRuntime {
  debug: boolean
  cwd: string
}

export interface ClipperArtifacts {
  rawHtml?: string
  cleanedHtml?: string
  screenshotPath?: string
  screenshot?: Uint8Array
}

export interface RequestState {
  url?: string
  headers?: Record<string, string>
}

export interface ResponseState {
  status?: number
  headers?: Record<string, string>
  body?: string
}

export interface ClientState {
  usedFallback?: boolean
  options?: Record<string, unknown>
}

export interface ClipperContext {
  input: ClipperInput
  runtime: ClipperRuntime
  request: RequestState
  response: ResponseState
  client: ClientState
  artifacts: ClipperArtifacts
  document?: ClipperDocument
}
