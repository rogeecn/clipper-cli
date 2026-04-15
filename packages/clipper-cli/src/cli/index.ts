#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runCollectCommand } from './commands/collect.js'
import { runPublishCommand } from './commands/publish.js'
import { listPlugins } from './commands/plugins.js'

function writeLine(value: string) {
  process.stdout.write(`${value}\n`)
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

export function buildCli() {
  const program = new Command()
  program.name('clipper-cli')

  program
    .command('collect <url>')
    .option('-o, --output <path>')
    .option('-f, --format <format>', 'output format', 'markdown')
    .option('-a, --assets', 'download static assets')
    .option('-p, --proxy <url>', 'proxy url for collection requests')
    .option('--debug', 'write debug artifacts')
    .action(async (
      url: string,
      options: { output?: string; format?: 'markdown' | 'json'; assets?: boolean; proxy?: string; debug?: boolean }
    ) => {
      await runCollectCommand({
        url,
        output: options.output,
        format: options.format,
        assets: options.assets,
        proxy: options.proxy,
        debug: options.debug
      })
    })

  program
    .command('publish <input>')
    .option('-o, --output <dir>')
    .option('-p, --publisher <name>', 'publisher name', 'markdown')
    .action(async (input: string, options: { output?: string; publisher?: string }) => {
      await runPublishCommand({
        input,
        output: options.output,
        publisher: options.publisher
      })
    })

  program
    .command('plugins')
    .option('--verbose', 'include plugin discovery diagnostics')
    .action(async (options: { verbose?: boolean }) => {
      const result = await listPlugins({ verbose: options.verbose })
      writeLine(result)
    })

  return program
}

if (isCliEntrypoint()) {
  void buildCli().parseAsync(process.argv)
}

export {}
