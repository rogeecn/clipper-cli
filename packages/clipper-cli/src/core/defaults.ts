import type { ClientOptions } from './client.js'
import { defaultTransformer } from '../transformers/default.js'
import { markdownPublisher } from '../publishers/markdown.js'
import { obsidianPublisher } from '../publishers/obsidian.js'
import type { RuntimeConfig } from '../types/plugin.js'

export const genericCollector = {
  name: 'generic',
  displayName: '通用网页',
  description: '采集常见 HTML 页面，提取标题和正文内容。',
  urlPatterns: [
    'http://*',
    'https://*'
  ],
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
