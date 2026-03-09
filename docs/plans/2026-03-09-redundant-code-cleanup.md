# Redundant Code Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove high-confidence unused helper exports and placeholder code without changing CLI behavior.

**Architecture:** Keep the cleanup strictly conservative: delete only symbols with no runtime callers and no meaningful behavior, then verify the remaining command and debug flows still work through focused tests. Avoid touching public package exports or broader refactors in this pass.

**Tech Stack:** TypeScript, Node.js, Vitest

---

### Task 1: Lock cleanup targets with a failing test

**Files:**
- Modify: `tests/cli/cli-action.test.ts`
- Test: `tests/cli/cli-action.test.ts`

**Step 1: Write the failing test**

Add a test that dynamically imports the command modules and asserts the unused helper exports are absent:

```ts
it('does not expose unused command registration helpers', async () => {
  const collectModule = await import('../../src/cli/commands/collect.js')
  const publishModule = await import('../../src/cli/commands/publish.js')
  const pluginsModule = await import('../../src/cli/commands/plugins.js')

  expect('registerCollectCommand' in collectModule).toBe(false)
  expect('registerPublishCommand' in publishModule).toBe(false)
  expect('registerPluginsCommand' in pluginsModule).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/cli-action.test.ts`
Expected: FAIL because those exports still exist

**Step 3: Write minimal implementation**

Delete the three `register*Command` exports from:
- `src/cli/commands/collect.ts`
- `src/cli/commands/publish.ts`
- `src/cli/commands/plugins.ts`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/cli-action.test.ts`
Expected: PASS

### Task 2: Remove placeholder debug helper

**Files:**
- Modify: `tests/core/debug.test.ts`
- Modify: `src/core/debug.ts`
- Test: `tests/core/debug.test.ts`

**Step 1: Write the failing test**

Add a test that dynamically imports `src/core/debug.ts` and asserts `createDebugArtifacts` is not exported:

```ts
it('does not expose the unused debug artifact factory', async () => {
  const debugModule = await import('../../src/core/debug.js')

  expect('createDebugArtifacts' in debugModule).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/debug.test.ts`
Expected: FAIL because `createDebugArtifacts` still exists

**Step 3: Write minimal implementation**

Delete `createDebugArtifacts` from `src/core/debug.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/debug.test.ts`
Expected: PASS

### Task 3: Verify no behavior regression

**Files:**
- Test: `tests/cli/cli-action.test.ts`
- Test: `tests/core/debug.test.ts`

**Step 1: Run focused regression tests**

Run: `npm test -- tests/cli/cli-action.test.ts tests/core/debug.test.ts`
Expected: PASS

**Step 2: Summarize cleanup**

Report removed symbols and note that this pass intentionally leaves riskier candidates untouched.
