import { resolveRuntimeConfig } from '../../core/config.js'

export async function listPlugins(options: { cwd?: string; config?: string } = {}) {
  const runtimeConfig = await resolveRuntimeConfig({ cwd: options.cwd, configPath: options.config })

  return {
    collectors: runtimeConfig.collectors.map((plugin) => plugin.name),
    transformers: runtimeConfig.transformers.map((plugin) => plugin.name),
    publishers: runtimeConfig.publishers.map((plugin) => plugin.name)
  }
}

