# CLI Help And Binary Name Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize the published CLI executable on `clipper-cli` and verify the built-in help output works through that command.

**Architecture:** Use Commander’s existing help generation rather than adding custom logic. Update the package bin metadata and root command name together, then tighten docs and tests around the new user-facing command contract.

**Tech Stack:** Node.js, TypeScript, Commander, Vitest, npm package metadata.

---

### Task 1: Add failing command-contract tests

**Files:**
- Modify: `tests/package-metadata.test.ts`
- Modify: `tests/cli/cli-action.test.ts`
- Reference: `packages/clipper-cli/package.json`
- Reference: `packages/clipper-cli/src/cli/index.ts`

**Step 1: Write the failing metadata test**

Add an assertion that the published package bin is exactly:

```ts
expect(packageJson.bin).toEqual({
  'clipper-cli': './dist/cli/index.js'
})
```

**Step 2: Write the failing help test**

Add a focused test that runs the built CLI entry with `--help` and asserts the output contains `Usage: clipper-cli` and at least one known subcommand such as `collect`.

**Step 3: Run tests to verify they fail**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/package-metadata.test.ts tests/cli/cli-action.test.ts`
Expected: FAIL because the package still exposes `clipper` and the CLI name is still `clipper`.

**Step 4: Commit**

Do not commit unless explicitly requested by the user.

### Task 2: Implement the naming change minimally

**Files:**
- Modify: `packages/clipper-cli/package.json`
- Modify: `packages/clipper-cli/src/cli/index.ts`
- Test: `tests/package-metadata.test.ts`
- Test: `tests/cli/cli-action.test.ts`

**Step 1: Update the bin metadata**

Change the package `bin` field to:

```json
{
  "clipper-cli": "./dist/cli/index.js"
}
```

**Step 2: Update the Commander root name**

Set:

```ts
program.name('clipper-cli')
```

Do not add any custom help handler.

**Step 3: Run focused tests to verify they pass**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/package-metadata.test.ts tests/cli/cli-action.test.ts`
Expected: PASS.

**Step 4: Commit**

Do not commit unless explicitly requested by the user.

### Task 3: Align user documentation and re-verify

**Files:**
- Modify: `packages/clipper-cli/README.md`
- Modify if needed: `README.md`
- Test: `tests/docs/readme.test.ts`

**Step 1: Update usage examples**

Replace `clipper` invocations with `clipper-cli` in user-facing install and usage docs that describe the published command.

**Step 2: Run targeted doc and package verification**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/docs/readme.test.ts tests/package-metadata.test.ts tests/cli/cli-action.test.ts`
Expected: PASS.

**Step 3: Review for scope drift**

Confirm the change is limited to executable naming, help coverage, and documentation alignment.

**Step 4: Commit**

Do not commit unless explicitly requested by the user.
