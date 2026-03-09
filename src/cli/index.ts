#!/usr/bin/env node

import { Command } from 'commander'
import { runCollectCommand } from './commands/collect.js'
import { runPublishCommand } from './commands/publish.js'
import { listPlugins } from './commands/plugins.js'

export function buildCli() {
  const program = new Command()
  program.name('clipper')

  program
    .command('collect <url>')
    .option('-o, --output <dir>')
    .option('-p, --publisher <name>', 'publisher name', 'markdown')
    .option('--debug', 'write debug artifacts')
    .action(async (url: string, options: { output?: string; publisher?: string; debug?: boolean }) => {
      await runCollectCommand({
        url,
        output: options.output,
        publisher: options.publisher,
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

  program.command('plugins').action(async () => {
    await listPlugins()
  })

  return program
}

export {}
