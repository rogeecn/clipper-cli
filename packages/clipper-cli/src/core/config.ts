import { access, readFile, realpath } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defaultConfig } from './defaults.js'
import { ClipperError } from './errors.js'
import type {
  ClipperPluginManifest,
  DiscoveredPlugin,
  LoadedPluginModule,
  PluginDiagnostic,
  PluginDiscoveryResult,
  RuntimeConfig,
  RuntimeConfigResolution
} from '../types/plugin.js'

const CONFIG_CANDIDATES = ['clipper.config.mjs', 'clipper.config.js', 'clipper.config.ts']
const PLUGIN_NAME_PATTERN = /^(?:@[^/]+\/)?clipper-plugin-/
const DEFAULT_DISCOVERY_RESULT: PluginDiscoveryResult = {
  discovered: [],
  loaded: [],
  diagnostics: []
}

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

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function resolvePackageManifestPath(cwd: string, packageName: string, specifier?: string): Promise<string> {
  if (specifier?.startsWith('file:') || specifier?.startsWith('link:')) {
    const dependencyPath = specifier.slice(specifier.indexOf(':') + 1)
    const manifestPath = resolve(cwd, dependencyPath, 'package.json')
    const manifest = await readJsonFile<Record<string, unknown>>(manifestPath)

    if (manifest.name === packageName) {
      return await realpath(manifestPath)
    }
  }

  let currentDir = cwd

  while (true) {
    const manifestPath = join(currentDir, 'node_modules', packageName, 'package.json')

    try {
      const manifest = await readJsonFile<Record<string, unknown>>(manifestPath)
      if (manifest.name === packageName) {
        return await realpath(manifestPath)
      }
    } catch {
      // continue walking upward
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      throw new Error(`failed to locate package.json for ${packageName}`)
    }

    currentDir = parentDir
  }
}

function getDependencyEntries(packageJson: Record<string, unknown>): Array<[string, string]> {
  const sections = ['dependencies', 'optionalDependencies', 'devDependencies'] as const
  const entries = new Map<string, string>()

  for (const section of sections) {
    const value = packageJson[section]
    if (value && typeof value === 'object') {
      for (const [name, specifier] of Object.entries(value as Record<string, string>)) {
        entries.set(name, specifier)
      }
    }
  }

  return [...entries.entries()]
}

function toManifest(packageJson: Record<string, unknown>, packageName: string): ClipperPluginManifest | undefined {
  const rawClipper = packageJson.clipper
  const matchesName = PLUGIN_NAME_PATTERN.test(packageName)

  if (!rawClipper || typeof rawClipper !== 'object') {
    if (!matchesName) {
      return undefined
    }

    return {
      packageName,
      plugin: true,
      apiVersion: 1
    }
  }

  const clipper = rawClipper as Record<string, unknown>

  if (clipper.plugin !== true && !matchesName) {
    return undefined
  }

  return {
    packageName,
    plugin: clipper.plugin === true || matchesName,
    apiVersion: typeof clipper.apiVersion === 'number' ? clipper.apiVersion : 1,
    kind: Array.isArray(clipper.kind) ? clipper.kind.filter((item): item is 'collector' | 'transformer' | 'publisher' => item === 'collector' || item === 'transformer' || item === 'publisher') : undefined,
    entry: typeof clipper.entry === 'string' ? clipper.entry : undefined
  }
}

function getEntryPath(packageJson: Record<string, unknown>, discovered: DiscoveredPlugin): string {
  if (discovered.manifest.entry) {
    return resolve(discovered.packagePath, discovered.manifest.entry)
  }

  const exportsField = packageJson.exports
  if (typeof exportsField === 'string') {
    return resolve(discovered.packagePath, exportsField)
  }

  if (exportsField && typeof exportsField === 'object') {
    const rootExport = (exportsField as Record<string, unknown>)['.']
    if (typeof rootExport === 'string') {
      return resolve(discovered.packagePath, rootExport)
    }
    if (rootExport && typeof rootExport === 'object') {
      const conditionalExport = rootExport as Record<string, unknown>
      const entryCandidate = conditionalExport.default ?? conditionalExport.import ?? conditionalExport.node
      if (typeof entryCandidate === 'string') {
        return resolve(discovered.packagePath, entryCandidate)
      }
    }
  }

  if (typeof packageJson.main === 'string') {
    return resolve(discovered.packagePath, packageJson.main)
  }

  return resolve(discovered.packagePath, 'index.js')
}

function isPluginModule(value: unknown): value is RuntimeConfig & { name: string } {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.name === 'string'
    && Array.isArray(candidate.collectors)
    && Array.isArray(candidate.transformers)
    && Array.isArray(candidate.publishers)
}

async function loadDiscoveredPlugins(discovered: DiscoveredPlugin[]): Promise<{ loaded: LoadedPluginModule[]; diagnostics: PluginDiagnostic[] }> {
  const loaded: LoadedPluginModule[] = []
  const diagnostics: PluginDiagnostic[] = []

  for (const plugin of discovered) {
    try {
      const packageJson = await readJsonFile<Record<string, unknown>>(plugin.manifestPath)
      const entryPath = getEntryPath(packageJson, plugin)
      const module = await import(pathToFileURL(entryPath).href)
      const exported = module.default ?? module.plugin

      if (!isPluginModule(exported)) {
        diagnostics.push({
          packageName: plugin.packageName,
          stage: 'validate',
          status: 'failed',
          message: 'plugin export must include name, collectors, transformers, and publishers'
        })
        continue
      }

      loaded.push({
        packageName: plugin.packageName,
        pluginName: exported.name,
        collectors: exported.collectors,
        transformers: exported.transformers,
        publishers: exported.publishers
      })
      diagnostics.push({
        packageName: plugin.packageName,
        stage: 'import',
        status: 'loaded',
        message: 'plugin loaded successfully'
      })
    } catch (error) {
      diagnostics.push({
        packageName: plugin.packageName,
        stage: 'import',
        status: 'failed',
        message: error instanceof Error ? error.message : 'failed to import plugin'
      })
    }
  }

  return { loaded, diagnostics }
}

export async function discoverPlugins(options: { cwd?: string; load?: boolean } = {}): Promise<PluginDiscoveryResult> {
  const cwd = options.cwd ?? process.cwd()
  const rootPackagePath = join(cwd, 'package.json')
  const rootPackageJson = await readJsonFile<Record<string, unknown>>(rootPackagePath)
  const dependencyEntries = getDependencyEntries(rootPackageJson)
  const diagnostics: PluginDiagnostic[] = []
  const discovered: DiscoveredPlugin[] = []

  for (const [packageName, specifier] of dependencyEntries) {
    try {
      const manifestPath = await resolvePackageManifestPath(cwd, packageName, specifier)
      const packageJson = await readJsonFile<Record<string, unknown>>(manifestPath)
      const manifest = toManifest(packageJson, packageName)

      if (!manifest) {
        continue
      }

      discovered.push({
        packageName,
        packagePath: dirname(manifestPath),
        manifestPath,
        manifest
      })
      diagnostics.push({
        packageName,
        stage: 'manifest',
        status: 'discovered',
        message: 'plugin manifest discovered'
      })
    } catch (error) {
      diagnostics.push({
        packageName,
        stage: 'resolve',
        status: 'failed',
        message: error instanceof Error ? error.message : 'failed to resolve package manifest'
      })
    }
  }

  if (!options.load) {
    return {
      discovered,
      loaded: [],
      diagnostics
    }
  }

  const loadedResult = await loadDiscoveredPlugins(discovered)
  return {
    discovered,
    loaded: loadedResult.loaded,
    diagnostics: [...diagnostics, ...loadedResult.diagnostics]
  }
}

export async function resolveRuntimeConfigResult(options: { cwd?: string; configPath?: string } = {}): Promise<RuntimeConfigResolution> {
  const cwd = options.cwd ?? process.cwd()
  const discoveredPath = options.configPath ?? await findConfig(cwd)
  const discoveredPlugins = await discoverPlugins({ cwd, load: true }).catch(() => DEFAULT_DISCOVERY_RESULT)
  const discoveredConfig: RuntimeConfig = {
    collectors: discoveredPlugins.loaded.flatMap((plugin) => plugin.collectors),
    transformers: discoveredPlugins.loaded.flatMap((plugin) => plugin.transformers),
    publishers: discoveredPlugins.loaded.flatMap((plugin) => plugin.publishers)
  }

  if (!discoveredPath) {
    return {
      collectors: mergeByName(defaultConfig.collectors, discoveredConfig.collectors),
      transformers: mergeByName(defaultConfig.transformers, discoveredConfig.transformers),
      publishers: mergeByName(defaultConfig.publishers, discoveredConfig.publishers),
      diagnostics: discoveredPlugins.diagnostics
    }
  }

  const loaded = await loadConfig(discoveredPath)

  ensurePluginArray('collectors', loaded.collectors)
  ensurePluginArray('transformers', loaded.transformers)
  ensurePluginArray('publishers', loaded.publishers)

  return {
    collectors: mergeByName(mergeByName(defaultConfig.collectors, discoveredConfig.collectors), loaded.collectors),
    transformers: mergeByName(mergeByName(defaultConfig.transformers, discoveredConfig.transformers), loaded.transformers),
    publishers: mergeByName(mergeByName(defaultConfig.publishers, discoveredConfig.publishers), loaded.publishers),
    diagnostics: discoveredPlugins.diagnostics
  }
}

export async function resolveRuntimeConfig(options: { cwd?: string; configPath?: string } = {}): Promise<RuntimeConfig> {
  const result = await resolveRuntimeConfigResult(options)
  return {
    collectors: result.collectors,
    transformers: result.transformers,
    publishers: result.publishers
  }
}
