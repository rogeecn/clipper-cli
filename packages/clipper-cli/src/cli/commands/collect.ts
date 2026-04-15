import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createRegistry } from '../../core/registry.js'
import { runPipeline } from '../../core/pipeline.js'
import { performRequest } from '../../core/request.js'
import { fetchHtml } from '../../core/fetcher.js'
import { resolveRuntimeConfig } from '../../core/config.js'
import { runWithPlaywright } from '../../core/playwright.js'
import { writeDebugArtifacts } from '../../core/debug.js'
import { buildDebugDocument } from '../../core/debug-metadata.js'
import { downloadAssets } from '../../core/assets.js'
import type { ClipperDocument } from '../../types/document.js'
import type { PublisherOutput, PublisherPlugin } from '../../types/plugin.js'

export interface CollectOptions {
  url: string
  output?: string
  format?: 'markdown' | 'json'
  assets?: boolean
  proxy?: string
  publisher?: string
  config?: string
  cwd?: string
  debug?: boolean
}

function createJsonOutput(outputDir: string, document: ClipperDocument): PublisherOutput {
  return {
    entryFile: join(outputDir, `${document.title}.json`),
    assetDir: join(outputDir, 'assets')
  }
}

function isPlainScalar(value: string): boolean {
  return /^[\p{L}\p{N} ._/@:+?&=%#\-]+$/u.test(value)
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') {
    return isPlainScalar(value) ? value : JSON.stringify(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

function formatYamlValue(value: unknown, indent = ''): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}[]`]
    }

    return value.flatMap((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item)

        if (entries.length === 0) {
          return [`${indent}- {}`]
        }

        const [firstKey, firstValue] = entries[0]
        const firstLine = formatYamlValue(firstValue, `${indent}  `)
        const lines = [`${indent}- ${firstKey}: ${firstLine[0].trimStart()}`]

        for (const line of firstLine.slice(1)) {
          lines.push(line)
        }

        for (const [key, nestedValue] of entries.slice(1)) {
          const nestedLines = formatYamlValue(nestedValue, `${indent}  `)
          lines.push(`${indent}  ${key}: ${nestedLines[0].trimStart()}`)
          for (const line of nestedLines.slice(1)) {
            lines.push(line)
          }
        }

        return lines
      }

      return [`${indent}- ${formatScalar(item)}`]
    })
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return [`${indent}{}`]
    }

    return entries.flatMap(([key, nestedValue]) => {
      const nestedLines = formatYamlValue(nestedValue, `${indent}  `)
      return [`${indent}${key}: ${nestedLines[0].trimStart()}`, ...nestedLines.slice(1)]
    })
  }

  return [`${indent}${formatScalar(value)}`]
}

function serializeMarkdownDocument(document: ClipperDocument): string {
  const frontMatter: Array<[string, unknown]> = [
    ['title', document.title],
    ['url', document.url],
    ['excerpt', document.excerpt],
    ['author', document.author],
    ['publishedAt', document.publishedAt],
    ['source', document.source]
  ].filter(([, value]) => value !== undefined && value !== '') as Array<[string, unknown]>

  if (document.tags.length > 0) {
    frontMatter.push(['tags', document.tags])
  }

  if (Object.keys(document.meta).length > 0) {
    frontMatter.push(['meta', document.meta])
  }

  const frontMatterBody = frontMatter.flatMap(([key, value]) => {
    const lines = formatYamlValue(value, '  ')
    return [`${key}: ${lines[0].trimStart()}`, ...lines.slice(1)]
  }).join('\n')

  return `---\n${frontMatterBody}\n---\n\n${document.content.markdown}`
}

function serializeCollectOutput(document: ClipperDocument, format: NonNullable<CollectOptions['format']>): string {
  if (format === 'json') {
    return JSON.stringify(document)
  }

  return serializeMarkdownDocument(document)
}

export async function runCollectCommand(options: CollectOptions) {
  const format = options.format ?? 'markdown'
  const runtimeConfig = await resolveRuntimeConfig({ cwd: options.cwd, configPath: options.config })
  const registry = createRegistry(runtimeConfig)
  const collector = registry.resolveCollectorPlugin(options.url)
  const transformer = collector ? registry.resolveTransformer(collector.name) ?? registry.resolveTransformer() : registry.resolveTransformer()
  const publisher: PublisherPlugin | null = options.output && format === 'markdown'
    ? registry.resolvePublisher(options.publisher ?? 'markdown')
    ?? null
    : null

  if (!collector || !transformer || (options.output && format === 'markdown' && !publisher)) {
    throw new Error('Missing runtime plugins')
  }

  const requestOptions = collector.buildClientOptions?.({
    input: {
      url: options.url,
      outputDir: options.output,
      publisher: publisher?.name,
      format,
      assets: options.assets ?? false,
      proxy: options.proxy,
      debug: options.debug,
      configPath: options.config
    },
    runtime: {
      debug: options.debug ?? false,
      cwd: options.cwd ?? process.cwd()
    },
    request: {},
    response: {},
    client: {},
    artifacts: {}
  }) ?? {}

  const context = await runPipeline({
    url: options.url,
    outputDir: options.output,
    format,
    assets: options.assets ?? false,
    proxy: options.proxy,
    configPath: options.config,
    debug: options.debug,
    cwd: options.cwd,
    collector,
    requestRunner: () => performRequest({
      url: options.url,
      ...(requestOptions as Record<string, unknown>),
      proxy: options.proxy,
      fetcher: fetchHtml
    }),
    clientRunner: runWithPlaywright,
    transformer,
    publisher
  })

  const document = context.document

  if (!document) {
    throw new Error('Pipeline did not produce a document')
  }

  let output: PublisherOutput | undefined

  if (options.output) {
    if (format === 'json') {
      output = createJsonOutput(options.output, document)
      await mkdir(options.output, { recursive: true })
      await mkdir(output.assetDir, { recursive: true })
      await writeFile(output.entryFile, serializeCollectOutput(document, format), 'utf8')
    } else {
      output = await publisher?.publish?.({
        input: { outputDir: options.output },
        document
      })
    }

    if (options.assets && output) {
      await downloadAssets({
        assets: document.assets,
        outputDir: output.assetDir,
        proxy: options.proxy
      })
    }
  } else {
    process.stdout.write(serializeCollectOutput(document, format))
  }

  const debugDocument = buildDebugDocument(document, context)

  const debugDir = options.debug
    ? await writeDebugArtifacts({
        cwd: options.cwd ?? process.cwd(),
        request: context.request,
        response: context.response,
        rawHtml: context.artifacts.rawHtml,
        cleanedHtml: context.artifacts.cleanedHtml ?? document.content.html,
        document: debugDocument,
        screenshot: context.artifacts.screenshot
      })
    : undefined

  return {
    collectorName: collector.name,
    document,
    output,
    debugDir
  }
}
