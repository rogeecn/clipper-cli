import { describe, expect, it } from 'vitest'
import { runHooks } from '../../src/hooks/runner'

describe('hook runner', () => {
  it('executes hooks in registration order', async () => {
    const calls: string[] = []

    await runHooks('beforeRequest', [
      { beforeRequest: async () => calls.push('a') },
      { beforeRequest: async () => calls.push('b') }
    ], {} as never)

    expect(calls).toEqual(['a', 'b'])
  })
})
