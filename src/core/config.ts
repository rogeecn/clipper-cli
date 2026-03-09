import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultConfig } from './defaults.js'
import { ClipperError } from './errors.js'
import type { RuntimeConfig } from '../types/plugin.js'

const CONFIG_CANDIDATES = ['clipper.config.mjs', 'clipper.config.js', 'clipper.config.ts']

export function defineConfig(config: RuntimeConfig): RuntimeConfig {
  return config
}

export async function findConfig(cwd: string): Promise<string | undefined> {
  for (const candidate of CONFIG_CANDIDATES) {
    const filePath = join(cwd, candidate)
    try {
      await access(filePath)
      return filePath
    } catch {
      // continue searching
    }
  }

  return undefined
}

export async function loadConfig(configPath: string): Promise<RuntimeConfig> {
  const module = await import(pathToFileURL(configPath).href)
  return module.default as RuntimeConfig
}

function ensurePluginArray(name: string, value: unknown): asserts value is Array<{ name: string }> {
  if (value === undefined) {
    return
  }

  if (!Array.isArray(value)) {
    throw new ClipperError('E_CONFIG_INVALID', `${name} must be an array`)
  }
}

function mergeByName<T extends { name: string }>(baseItems: T[], overrideItems: T[] = []): T[] {
  const merged = new Map<string, T>()

  for (const item of overrideItems) {
    merged.set(item.name, item)
  }

  for (const item of baseItems) {
    if (!merged.has(item.name)) {
      merged.set(item.name, item)
    }
  }

  return [...merged.values()]
}

export async function resolveRuntimeConfig(options: { cwd?: string; configPath?: string } = {}): Promise<RuntimeConfig> {
  const cwd = options.cwd ?? process.cwd()
  const discoveredPath = options.configPath ?? await findConfig(cwd)

  if (!discoveredPath) {
    return defaultConfig
  }

  const loaded = await loadConfig(discoveredPath)

  ensurePluginArray('collectors', loaded.collectors)
  ensurePluginArray('transformers', loaded.transformers)
  ensurePluginArray('publishers', loaded.publishers)

  return {
    collectors: mergeByName(defaultConfig.collectors, loaded.collectors),
    transformers: mergeByName(defaultConfig.transformers, loaded.transformers),
    publishers: mergeByName(defaultConfig.publishers, loaded.publishers)
  }
}
