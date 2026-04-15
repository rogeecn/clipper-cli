import { afterEach, describe, expect, it, vi } from 'vitest'

import { listPlugins } from '../../src/cli/commands/plugins.js'

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('package-local cli behavior', () => {
  it('registers collect, publish, and plugins commands', async () => {
    const { buildCli } = await import('../../src/cli/index.js')
    const program = buildCli()
    const commandNames = program.commands.map((command) => command.name())

    expect(commandNames).toContain('collect')
    expect(commandNames).toContain('publish')
    expect(commandNames).toContain('plugins')
  })

  it('registers the collect command format, assets, and proxy options', async () => {
    const { buildCli } = await import('../../src/cli/index.js')
    const program = buildCli()
    const collectCommand = program.commands.find((command) => command.name() === 'collect')

    expect(collectCommand?.options.map((option) => option.flags)).toEqual(
      expect.arrayContaining([
        '-o, --output <path>',
        '-f, --format <format>',
        '-a, --assets',
        '-p, --proxy <url>',
        '--debug'
      ])
    )
  })

  it('maps collect CLI options into runCollectCommand input', async () => {
    const runCollectCommand = vi.fn().mockResolvedValue(undefined)

    vi.doMock('../../src/cli/commands/collect.js', () => ({
      runCollectCommand
    }))

    const { buildCli } = await import('../../src/cli/index.js')
    const program = buildCli()

    await program.parseAsync(
      ['collect', 'https://example.com/post', '-f', 'json', '-a', '-p', 'http://127.0.0.1:7890'],
      { from: 'user' }
    )

    expect(runCollectCommand).toHaveBeenCalledWith({
      url: 'https://example.com/post',
      output: undefined,
      format: 'json',
      assets: true,
      proxy: 'http://127.0.0.1:7890',
      debug: undefined
    })
  })

  it('lists runtime plugin names instead of a placeholder payload', async () => {
    const result = await listPlugins()

    expect(result.collectors).toContain('generic')
    expect(result.transformers).toContain('default')
    expect(result.publishers).toContain('markdown')
    expect(result.publishers).toContain('obsidian')
    expect(result).not.toHaveProperty('status')
  })
})
