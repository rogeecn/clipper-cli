import { resolveRuntimeConfigResult } from '../../core/config.js'

export async function listPlugins(options: { cwd?: string; config?: string; verbose?: boolean; globalNodeModulesPath?: string } = {}) {
  const runtimeConfig = await resolveRuntimeConfigResult({ cwd: options.cwd, configPath: options.config, globalNodeModulesPath: options.globalNodeModulesPath })

  return {
    collectors: runtimeConfig.collectors.map((plugin) => plugin.name),
    transformers: runtimeConfig.transformers.map((plugin) => plugin.name),
    publishers: runtimeConfig.publishers.map((plugin) => plugin.name),
    diagnostics: options.verbose ? runtimeConfig.diagnostics : undefined
  }
}
