import type { RuntimeConfig } from '../types/plugin.js'

export function createRegistry(config: RuntimeConfig) {
  return {
    resolveCollector(input: string) {
      const url = new URL(input)
      const match = config.collectors.find((plugin) => plugin.match(url))
      return match?.name
    },
    resolveCollectorPlugin(input: string) {
      const url = new URL(input)
      return config.collectors.find((plugin) => plugin.match(url))
    },
    resolveTransformer(name?: string) {
      if (!name) {
        return config.transformers[0]
      }
      return config.transformers.find((plugin) => plugin.name === name)
    },
    resolvePublisher(name?: string) {
      if (!name) {
        return config.publishers[0]
      }
      return config.publishers.find((plugin) => plugin.name === name)
    }
  }
}
