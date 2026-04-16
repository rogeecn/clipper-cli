#!/usr/bin/env node

import { realpathSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runCollectCommand } from './commands/collect.js'
import { runPublishCommand } from './commands/publish.js'
import { listPlugins } from './commands/plugins.js'

function writeLine(value: string) {
  process.stdout.write(`${value}\n`)
}

function formatThrowable(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error) ?? String(error)
  } catch {
    return String(error)
  }
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
      const startedAt = Date.now()

      try {
        const result = await runCollectCommand({
          url,
          output: options.output,
          format: options.format,
          assets: options.assets,
          proxy: options.proxy,
          debug: options.debug
        })

        if (!options.output) {
          return
        }

        const entryFile = result.output?.entryFile

        if (!entryFile) {
          throw new Error('Collect command did not return an output file path')
        }

        const outputStats = await stat(entryFile)

        writeLine('是否成功: 是')
        writeLine(`内容大小: ${outputStats.size} bytes`)
        writeLine(`保存文件路径: ${entryFile}`)
        writeLine(`采集耗时: ${Date.now() - startedAt}ms`)
      } catch (error) {
        if (!options.output) {
          throw error
        }

        process.exitCode = 1
        writeLine('采集状态: 失败')
        writeLine(`失败原因: ${formatThrowable(error)}`)
      }
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
