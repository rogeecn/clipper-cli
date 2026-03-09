# Workspace Root Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove legacy single-package source, build output, and config from the repository root so the workspace structure is the only real source of truth.

**Architecture:** Keep the repository root as a pure workspace coordinator and move all package-specific responsibility into `packages/clipper-cli` and `packages/clipper-plugin-weixin`. Lock the intended root role with tests first, then delete the obsolete root directories and configs, and finally verify that all root and package workflows still pass without the old structure present.

**Tech Stack:** pnpm workspace, TypeScript, Vitest, Node ESM

---

### Task 1: Lock root-only workspace behavior with failing tests first

**Files:**
- Modify: `tests/workspace-root.test.ts`
- Modify: `tests/package-publish.test.ts`
- Modify: `tests/package.test.ts`
- Modify: `tests/package-metadata.test.ts`
- Create: `tests/root-cleanup.test.ts`

**Step 1: Write the failing test**

Add a new root cleanup test asserting the root no longer acts like a package source tree and that package-specific responsibilities live under `packages/*`.

```ts
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('workspace root cleanup contract', () => {
  it('does not keep legacy single-package source directories at the root', () => {
    expect(existsSync('src')).toBe(false)
    expect(existsSync('dist')).toBe(false)
    expect(existsSync('examples')).toBe(false)
  })
})
```

Also extend existing root package tests to assert the root only exposes workspace coordination scripts and no package-local build/test config files.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/root-cleanup.test.ts tests/workspace-root.test.ts tests/package-publish.test.ts tests/package.test.ts tests/package-metadata.test.ts`
Expected: FAIL because the legacy root directories and config files still exist.

**Step 3: Write minimal implementation**

Only adjust tests in this step so they express the desired cleanup contract clearly. Do not delete files yet.

**Step 4: Run test to verify it still fails for the right reason**

Run: `pnpm vitest run tests/root-cleanup.test.ts tests/workspace-root.test.ts tests/package-publish.test.ts tests/package.test.ts tests/package-metadata.test.ts`
Expected: FAIL specifically because the old root structure still exists.

**Step 5: Commit**

```bash
git add tests/root-cleanup.test.ts tests/workspace-root.test.ts tests/package-publish.test.ts tests/package.test.ts tests/package-metadata.test.ts
git commit -m "test: lock workspace root cleanup contract"
```

### Task 2: Remove legacy root directories with focused verification

**Files:**
- Delete: `src/**`
- Delete: `dist/**`
- Delete: `examples/**`
- Modify: any tests that still reference these old root paths

**Step 1: Write the failing test**

Use the Task 1 cleanup contract as the failing test baseline. If any root tests still import from `src/` or `dist/`, update them to the package locations first and verify they fail because the cleanup has not happened yet.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/root-cleanup.test.ts tests/core/plugin-discovery.test.ts tests/plugins/weixin.test.ts`
Expected: FAIL while the old root paths/directories still exist or the remaining imports still point at them.

**Step 3: Write minimal implementation**

- Delete root `src/`
- Delete root `dist/`
- Delete root `examples/`
- Update any root-level tests/imports to use `packages/clipper-cli` or `packages/clipper-plugin-weixin` as the real source of truth

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/root-cleanup.test.ts tests/core/plugin-discovery.test.ts tests/plugins/weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy root source directories"
```

### Task 3: Remove obsolete root package config files with failing tests first

**Files:**
- Delete: `tsconfig.json`
- Delete: `vitest.config.ts`
- Delete: `package-lock.json`
- Delete: `.npmignore`
- Modify: root test or script files that still depend on them
- Modify: `package.json`

**Step 1: Write the failing test**

Extend `tests/root-cleanup.test.ts` to assert that root no longer carries package-local config files from the old single-package setup.

```ts
it('keeps only workspace-level root config files', () => {
  expect(existsSync('pnpm-workspace.yaml')).toBe(true)
  expect(existsSync('pnpm-lock.yaml')).toBe(true)
  expect(existsSync('tsconfig.json')).toBe(false)
  expect(existsSync('vitest.config.ts')).toBe(false)
  expect(existsSync('package-lock.json')).toBe(false)
  expect(existsSync('.npmignore')).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/root-cleanup.test.ts`
Expected: FAIL because the old root config files still exist.

**Step 3: Write minimal implementation**

- Delete the obsolete root config files
- Ensure root scripts still work without them
- If needed, move any remaining root test config into inline Vitest CLI usage or package-local configs

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/root-cleanup.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "build: remove legacy root package configs"
```

### Task 4: Make root tests hermetic without root package source files

**Files:**
- Modify: `tests/plugins/weixin.test.ts`
- Modify: `tests/core/plugin-discovery.test.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Modify: `tests/cli/collect-weixin.test.ts`
- Modify: `package.json`
- Modify: any root test bootstrap logic if needed

**Step 1: Write the failing test**

Force a clean root test run with package-local builds only and no root package source tree present.

**Step 2: Run test to verify it fails**

Run: `rm -rf packages/clipper-cli/dist packages/clipper-plugin-weixin/dist && pnpm test`
Expected: If hermeticity is incomplete, FAIL because some root tests still rely on stale build artifacts or deleted root paths.

**Step 3: Write minimal implementation**

- Ensure root `pnpm test` script builds required workspace packages first
- Ensure root tests import from stable package boundaries, not deleted root directories
- Keep root test behavior honest about package build prerequisites

**Step 4: Run test to verify it passes**

Run: `rm -rf packages/clipper-cli/dist packages/clipper-plugin-weixin/dist && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tests/core/plugin-discovery.test.ts tests/plugins/weixin.test.ts tests/cli/plugins-list.test.ts tests/cli/collect-weixin.test.ts
git commit -m "test: make workspace root checks hermetic"
```

### Task 5: Run final cleanup verification

**Files:**
- Modify: no source files expected

**Step 1: Verify root shape**

Run: `pnpm vitest run tests/root-cleanup.test.ts tests/workspace-root.test.ts tests/package-publish.test.ts tests/package.test.ts tests/package-metadata.test.ts`
Expected: PASS

**Step 2: Verify workspace tests**

Run: `pnpm test`
Expected: PASS

**Step 3: Verify package-local tests**

Run: `pnpm --filter clipper-cli test`
Run: `pnpm --filter clipper-plugin-weixin test`
Expected: PASS

**Step 4: Verify package tarballs**

Run: `npm pack --dry-run`
Workdir: `packages/clipper-cli`

Run: `npm pack --dry-run`
Workdir: `packages/clipper-plugin-weixin`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: clean legacy workspace root files"
```
