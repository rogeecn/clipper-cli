import { readFile } from 'node:fs/promises'
import { createRegistry } from '../../core/registry.js'
import { resolveRuntimeConfig } from '../../core/config.js'
import type { ClipperDocument } from '../../types/document.js'

export interface PublishOptions {
  input: string
  output?: string
  publisher?: string
  config?: string
  cwd?: string
}

export async function runPublishCommand(options: PublishOptions) {
  const runtimeConfig = await resolveRuntimeConfig({ cwd: options.cwd, configPath: options.config })
  const registry = createRegistry(runtimeConfig)
  const publisher = registry.resolvePublisher(options.publisher)

  if (!publisher || !publisher.publish) {
    throw new Error('Missing publisher implementation')
  }

  const document = JSON.parse(await readFile(options.input, 'utf8')) as ClipperDocument
  const output = await publisher.publish({
    input: { outputDir: options.output },
    document
  })

  return {
    document,
    output
  }
}

export function registerPublishCommand() {
  return {
    name: 'publish'
  }
}
