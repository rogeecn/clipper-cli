import type { ClientOptions } from './client.js'
import { defaultTransformer } from '../transformers/default.js'
import { markdownPublisher } from '../publishers/markdown.js'
import { obsidianPublisher } from '../publishers/obsidian.js'
import type { RuntimeConfig } from '../types/plugin.js'

export const genericCollector = {
  name: 'generic',
  match() {
    return true
  },
  shouldFallback() {
    return false
  },
  buildClientOptions(): Partial<ClientOptions> {
    return {
      waitUntil: 'networkidle'
    }
  }
}

export const defaultConfig: RuntimeConfig = {
  collectors: [genericCollector],
  transformers: [defaultTransformer],
  publishers: [markdownPublisher, obsidianPublisher]
}
