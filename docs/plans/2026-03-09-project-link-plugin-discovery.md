# Project Link Plugin Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `clipper plugins` work from the installed CLI again, and ensure project-level `npm link clipper-plugin-weixin` is discoverable because plugin discovery follows the current project's dependency graph rather than global npm registrations.

**Architecture:** Keep plugin discovery scoped to the active project so runtime behavior remains explicit and reproducible. Fix the CLI entrypoint so the installed `clipper` binary actually parses and executes commands, then add focused tests that prove project-visible linked dependencies are discovered while bare global links are not treated as active project plugins.

**Tech Stack:** Node.js, TypeScript, Commander, npm link semantics, Vitest

---

### Task 1: Restore installed CLI execution

**Files:**
- Modify: `packages/clipper-cli/src/cli/index.ts`
- Test: `tests/cli/cli-action.test.ts`

**Step 1: Write the failing test**

Add a test that executes the built CLI module entry behavior instead of only calling `buildCli()` directly:

```ts
it('runs the binary entry and prints plugins output', async () => {
  const stdout = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
  const argv = process.argv

  process.argv = ['node', 'clipper', 'plugins']
  await import('../../packages/clipper-cli/src/cli/index.js')

  expect(stdout).toHaveBeenCalledWith(expect.stringContaining('collectors'))
  process.argv = argv
})
```

Use module reset or an isolated import approach if needed so the test can exercise module-side execution honestly.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/cli/cli-action.test.ts`
Expected: FAIL because the CLI module currently only exports `buildCli()` and never calls `parseAsync()` when used as the binary entry.

**Step 3: Write minimal implementation**

In `packages/clipper-cli/src/cli/index.ts`:

```ts
async function main(argv = process.argv) {
  const program = buildCli()
  await program.parseAsync(argv)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main()
}
```

Handle the direct-entry check safely for Node ESM so imports used by tests do not accidentally execute unless they intentionally simulate the binary. Keep the exported `buildCli()` API intact.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/cli/cli-action.test.ts`
Expected: PASS and captured stdout contains the JSON payload from `plugins`.

**Step 5: Commit**

```bash
git add packages/clipper-cli/src/cli/index.ts tests/cli/cli-action.test.ts
git commit -m "fix: execute installed clipper binary entry"
```

### Task 2: Lock project-visible plugin discovery semantics

**Files:**
- Modify: `tests/core/plugin-discovery.test.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Create: `tests/fixtures/discovery-linked-app/package.json`

**Step 1: Write the failing tests**

Add one discovery-level test and one CLI-level test for a project that references the plugin by package name only:

```ts
it('discovers a project-linked plugin from node_modules by package name', async () => {
  const result = await discoverPlugins({ cwd: fixtureLinkedCwd, load: true })

  expect(result.loaded.find((plugin) => plugin.packageName === 'clipper-plugin-weixin')?.pluginName)
    .toBe('clipper-plugin-weixin')
})
```

```ts
it('includes package-name linked plugins when the project links them explicitly', async () => {
  const result = await listPlugins({ cwd: fixtureLinkedCwd })

  expect(result.collectors).toContain('weixin')
  expect(result.transformers).toContain('weixin')
})
```

Use a fixture app whose `package.json` declares:

```json
{
  "name": "discovery-linked-app",
  "private": true,
  "type": "module",
  "dependencies": {
    "clipper-plugin-weixin": "*"
  }
}
```

The test should rely on the existing linked package being resolvable through `node_modules`, matching the recommended `npm link clipper-plugin-weixin` workflow.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: FAIL until the linked fixture and any necessary resolution handling are in place.

**Step 3: Write minimal implementation**

If resolution already works after adding the fixture, keep code changes minimal and only retain the test coverage. If it fails, adjust `packages/clipper-cli/src/core/config.ts` so package resolution remains project-scoped but supports named linked dependencies resolved from the current project's `node_modules` chain.

The intended behavior is:

- global `npm link` alone does not activate a plugin for arbitrary projects
- project-level `npm link clipper-plugin-weixin` does activate it because the package becomes a dependency visible to that project's `node_modules`
- `file:` and workspace-based dependencies continue to work unchanged

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS for both fixture-based direct discovery and `listPlugins()` output.

**Step 5: Commit**

```bash
git add tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts tests/fixtures/discovery-linked-app/package.json packages/clipper-cli/src/core/config.ts
git commit -m "test: cover project-linked plugin discovery"
```

### Task 3: Document the recommended `npm link` workflow

**Files:**
- Modify: `packages/clipper-plugin-weixin/README.md`
- Modify: `README.md`

**Step 1: Write the failing documentation checklist**

Verify both docs are missing or unclear on the two-step link workflow:

Run: `rg "npm link|clipper plugins|project dependency|global link" README.md packages/clipper-plugin-weixin/README.md`
Expected: output is missing a clear explanation that plugin discovery only follows the current project's dependencies.

**Step 2: Write minimal documentation update**

Update docs to show the recommended workflow explicitly:

```md
# In the plugin package
npm link

# In the project where clipper runs
npm link clipper-plugin-weixin
clipper plugins --verbose
```

Also state that running only `npm link` inside the plugin package registers a global package link but does not make the current project depend on that plugin yet.

**Step 3: Verify documentation update**

Run: `rg "npm link|clipper plugins|当前项目|project" README.md packages/clipper-plugin-weixin/README.md`
Expected: matches show the explicit two-step workflow and diagnostic command.

**Step 4: Commit**

```bash
git add README.md packages/clipper-plugin-weixin/README.md
git commit -m "docs: explain project-level plugin link workflow"
```

### Task 4: Run focused verification

**Files:**
- Test: `tests/cli/cli-action.test.ts`
- Test: `tests/core/plugin-discovery.test.ts`
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Run focused tests**

Run: `pnpm vitest run tests/cli/cli-action.test.ts tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS

**Step 2: Run package build**

Run: `pnpm --filter clipper-cli build`
Expected: PASS

**Step 3: Run manual smoke check**

Run from a project that has executed `npm link clipper-plugin-weixin`:

```bash
clipper plugins
clipper plugins --verbose
```

Expected: JSON output contains `weixin` under `collectors` and `transformers`, and diagnostics show the plugin as discovered and loaded.

**Step 4: Summarize any unrelated failures**

If any unrelated failures appear, document them and stop rather than broadening scope.

**Step 5: Commit**

```bash
git add .
git commit -m "fix: restore project-linked plugin discovery workflow"
```