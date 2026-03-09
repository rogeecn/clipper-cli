import { resolveRuntimeConfigResult } from '../../core/config.js'

export async function listPlugins(options: { cwd?: string; config?: string; verbose?: boolean } = {}) {
  const runtimeConfig = await resolveRuntimeConfigResult({ cwd: options.cwd, configPath: options.config })

  return {
    collectors: runtimeConfig.collectors.map((plugin) => plugin.name),
    transformers: runtimeConfig.transformers.map((plugin) => plugin.name),
    publishers: runtimeConfig.publishers.map((plugin) => plugin.name),
    diagnostics: options.verbose ? runtimeConfig.diagnostics : undefined
  }
}

export function registerPluginsCommand() {
  return {
    name: 'plugins'
  }
}
