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
  method?: string
  headers?: Record<string, string>
  body?: string
  redirect?: string
  referrer?: string
  referrerPolicy?: string
  mode?: string
  credentials?: string
  cache?: string
  integrity?: string
  timeout?: number
  runtime?: {
    cwd?: string
    debug?: boolean
    input?: {
      url?: string
      outputDir?: string
      publisher?: string
      configPath?: string
    }
  }
  pipeline?: {
    collector?: string
    transformer?: string
    publisher?: string
  }
  clientFallback?: {
    usedFallback?: boolean
    options?: Record<string, unknown>
  }
}

export interface ResponseState {
  url?: string
  status?: number
  statusText?: string
  ok?: boolean
  redirected?: boolean
  headers?: Record<string, string>
  body?: string
  runtime?: {
    cwd?: string
    debug?: boolean
  }
  pipeline?: {
    collector?: string
    transformer?: string
    publisher?: string
  }
  clientFallback?: {
    usedFallback?: boolean
    options?: Record<string, unknown>
  }
  content?: {
    rawHtmlSource?: string
  }
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
