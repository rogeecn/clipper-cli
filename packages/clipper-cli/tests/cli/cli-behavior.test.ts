import { describe, expect, it } from 'vitest'

import { buildCli } from '../../src/cli/index.js'
import { listPlugins } from '../../src/cli/commands/plugins.js'

describe('package-local cli behavior', () => {
  it('registers collect, publish, and plugins commands', () => {
    const program = buildCli()
    const commandNames = program.commands.map((command) => command.name())

    expect(commandNames).toContain('collect')
    expect(commandNames).toContain('publish')
    expect(commandNames).toContain('plugins')
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
