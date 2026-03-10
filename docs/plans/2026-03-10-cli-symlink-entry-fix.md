# CLI Symlink Entry Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make globally installed `clipper` execute correctly when launched through the npm-generated symlink in the global bin directory.

**Architecture:** Keep the current direct-entry guard, but compare real filesystem paths instead of raw path/url strings. Add a regression test that runs the global symlinked `clipper` binary in a subprocess and verifies command output, then implement the smallest possible path-resolution fix.

**Tech Stack:** Node.js, TypeScript, fs/promises realpath, Commander, Vitest

---

### Task 1: Add a failing symlink-entry regression test

**Files:**
- Modify: `tests/cli/cli-action.test.ts`
- Test: `tests/cli/cli-action.test.ts`

**Step 1: Write the failing test**

Add a subprocess test that executes the global `clipper` shim path from `which clipper` and asserts it prints plugin output:

```ts
it('executes commands when launched through the global clipper symlink', () => {
  const output = execFileSync('clipper', ['plugins', '--verbose'], {
    cwd: fixtureProjectDir,
    encoding: 'utf8'
  })

  expect(output).toContain('collectors')
  expect(output).toContain('weixin')
})
```

Use a fixture or temp project where `clipper-plugin-weixin` is visible so the regression reflects the actual user scenario.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/cli-action.test.ts -t "global clipper symlink"`
Expected: FAIL because the current entry guard does not execute when `process.argv[1]` is the symlink path.

**Step 3: Write minimal implementation**

Update `packages/clipper-cli/src/cli/index.ts` to resolve symlinks before comparing the invoked path against the module path. Example shape:

```ts
import { realpath } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

async function isDirectExecution() {
  if (!process.argv[1]) return false

  const invokedPath = await realpath(process.argv[1])
  const modulePath = await realpath(fileURLToPath(import.meta.url))
  return invokedPath === modulePath
}

if (await isDirectExecution()) {
  await buildCli().parseAsync(process.argv)
}
```

Keep the API shape minimal and preserve `buildCli()` exports.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-cli build && pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/cli-action.test.ts -t "global clipper symlink"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-cli/src/cli/index.ts tests/cli/cli-action.test.ts
git commit -m "fix: support symlinked clipper entry"
```

### Task 2: Re-verify the real user workflow

**Files:**
- Test: `packages/clipper-cli/src/cli/index.ts`
- Test: `packages/clipper-plugin-weixin/package.json`

**Step 1: Build the CLI and plugin**

Run: `pnpm --filter clipper-cli build && pnpm --filter clipper-plugin-weixin build`
Expected: PASS

**Step 2: Reinstall the global CLI link**

Run: `cd /home/rogee/Projects/clipper-cli/packages/clipper-cli && npm install -g .`
Expected: PASS and the global `clipper` symlink points to the current build.

**Step 3: Verify the direct user flow**

In a temp consumer directory:

```bash
npm install file:/home/rogee/Projects/clipper-cli/packages/clipper-plugin-weixin
clipper plugins --verbose
```

Expected: JSON output contains `weixin` and diagnostics show the plugin loaded.

**Step 4: Report the exact shortest working steps**

Give the user the exact sequence verified on this machine.

**Step 5: Commit**

```bash
git add .
git commit -m "fix: restore global clipper plugin listing"
```