import { describe, expect, it } from 'vitest'
import { buildCli } from '../../src/cli/index'

describe('collect command', () => {
  it('registers the collect command', () => {
    const program = buildCli()
    expect(program.commands.map((command) => command.name())).toContain('collect')
  })
})
