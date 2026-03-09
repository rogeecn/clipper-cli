export async function runHooks<TContext>(
  name: string,
  hooks: Array<Record<string, ((ctx: TContext) => Promise<void> | void) | undefined>>,
  ctx: TContext
): Promise<void> {
  for (const hook of hooks) {
    const handler = hook[name]
    if (handler) {
      await handler(ctx)
    }
  }
}
