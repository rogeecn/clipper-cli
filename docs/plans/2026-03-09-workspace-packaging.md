# Workspace Packaging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the repository into a workspace where `clipper-cli` and `clipper-plugin-weixin` live side-by-side as separate publishable packages.

**Architecture:** Turn the repository root into a workspace coordinator, move the existing CLI package into `packages/clipper-cli`, extract the Weixin plugin into `packages/clipper-plugin-weixin`, and update tests plus fixture apps to validate both source-level behavior and installed-package discovery. Keep package publishing boundaries explicit so each package can be versioned and published independently.

**Tech Stack:** pnpm workspace, TypeScript, Vitest, Node ESM, existing plugin discovery runtime

---

### Task 1: Create workspace root and preserve current package behavior with failing tests first

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tests/workspace-root.test.ts`
- Modify: `tests/package.test.ts`
- Modify: `tests/package-metadata.test.ts`
- Modify: `tests/package-publish.test.ts`

**Step 1: Write the failing test**

Add a root-level workspace test asserting the root package is private and declares workspace scripts, then update the existing package metadata tests so they no longer assume the repository root itself is the publishable CLI package.

```ts
import pkg from '../package.json'
import { describe, expect, it } from 'vitest'

describe('workspace root', () => {
  it('is configured as a private workspace coordinator', () => {
    expect(pkg.private).toBe(true)
    expect(pkg.workspaces ?? pkg.scripts).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/workspace-root.test.ts tests/package.test.ts tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: FAIL because the root package is still the publishable `clipper-cli` package and `pnpm-workspace.yaml` does not exist.

**Step 3: Write minimal implementation**

- Convert the root `package.json` into a workspace root package (`private: true`)
- Add workspace scripts like `build`, `test`, and filtered package commands
- Add `pnpm-workspace.yaml` with `packages/*`
- Update the existing root package tests so they validate the workspace root instead of a publishable CLI package

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/workspace-root.test.ts tests/package.test.ts tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml tests/workspace-root.test.ts tests/package.test.ts tests/package-metadata.test.ts tests/package-publish.test.ts
git commit -m "build: add workspace root configuration"
```

### Task 2: Move `clipper-cli` into `packages/clipper-cli` with failing package tests first

**Files:**
- Create: `packages/clipper-cli/package.json`
- Create: `packages/clipper-cli/tsconfig.json`
- Move: `src/**` → `packages/clipper-cli/src/**`
- Move: `README.md` → `packages/clipper-cli/README.md`
- Move or adapt: `examples/**` → `packages/clipper-cli/examples/**`
- Modify: root `tsconfig.json` or create workspace/shared tsconfig files as needed
- Create: `packages/clipper-cli/tests/package.test.ts`
- Create: `packages/clipper-cli/tests/package-metadata.test.ts`
- Create: `packages/clipper-cli/tests/package-publish.test.ts`

**Step 1: Write the failing test**

Copy the current package metadata/bootstrap/publish tests into `packages/clipper-cli/tests/` and retarget them to `packages/clipper-cli/package.json`.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-cli test -- tests/package.test.ts tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: FAIL because `packages/clipper-cli/package.json` and its package-local test environment do not exist yet.

**Step 3: Write minimal implementation**

- Create `packages/clipper-cli/package.json` with the current publishable metadata from the old root package
- Move/adjust source files and package assets into `packages/clipper-cli`
- Ensure the CLI package still builds to a `dist` directory and exposes the `clipper` bin entry

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-cli test -- tests/package.test.ts tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-cli root-config-files
git commit -m "refactor: move clipper cli into workspace package"
```

### Task 3: Rewire CLI tests and build paths with failing focused tests first

**Files:**
- Modify: all test imports currently pointing at `../src` or `../../src`
- Modify: build/test scripts for `packages/clipper-cli`
- Modify: any path-sensitive runtime tests
- Modify: `packages/clipper-cli/README.md` if package-local paths differ

**Step 1: Write the failing test**

Pick a focused CLI/runtime subset that proves the moved package still works from its new location, for example:
- `tests/cli/collect-run.test.ts`
- `tests/core/plugin-discovery.test.ts`
- `tests/cli/collect-weixin.test.ts`

Retarget imports/paths to the new package layout and let them fail against the not-yet-complete path migration.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-cli test -- tests/cli/collect-run.test.ts tests/core/plugin-discovery.test.ts tests/cli/collect-weixin.test.ts`
Expected: FAIL because source/test imports and fixture cwd assumptions still point at the old root package layout.

**Step 3: Write minimal implementation**

- Update imports to point at `packages/clipper-cli/src/...`
- Fix package-local relative paths, README lookups, and fixture cwd assumptions
- Ensure package-local `npm test` / `pnpm test` still runs the existing test suite cleanly from the package directory

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-cli test -- tests/cli/collect-run.test.ts tests/core/plugin-discovery.test.ts tests/cli/collect-weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-cli/tests packages/clipper-cli/src
 git commit -m "test: rewire cli tests for workspace layout"
```

### Task 4: Extract `clipper-plugin-weixin` into a real workspace package using failing plugin tests first

**Files:**
- Create: `packages/clipper-plugin-weixin/package.json`
- Create: `packages/clipper-plugin-weixin/tsconfig.json`
- Create: `packages/clipper-plugin-weixin/src/index.ts`
- Create: `packages/clipper-plugin-weixin/README.md`
- Move/adapt logic from: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.js`
- Create: `packages/clipper-plugin-weixin/tests/weixin.test.ts`

**Step 1: Write the failing test**

Create package-local plugin tests based on the existing fixture plugin behavior tests, but target `packages/clipper-plugin-weixin/src/index.ts` instead of the fixture copy.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-plugin-weixin test -- tests/weixin.test.ts`
Expected: FAIL because the real package does not exist yet.

**Step 3: Write minimal implementation**

- Create the real `clipper-plugin-weixin` package
- Port the collector/transformer logic from the fixture package into package source
- Add package metadata (`clipper.plugin`, `exports`, `files`)
- Keep the output contract aligned with the CLI host plugin protocol

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-plugin-weixin test -- tests/weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-plugin-weixin
git commit -m "feat: extract weixin plugin workspace package"
```

### Task 5: Replace fixture plugin source with installed-package wiring and failing discovery tests first

**Files:**
- Modify: `tests/fixtures/discovery-app/package.json`
- Modify or remove: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/**`
- Modify: `tests/core/plugin-discovery.test.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Modify: `tests/cli/collect-weixin.test.ts`
- Add any test setup script needed to install/build workspace packages for fixture apps

**Step 1: Write the failing test**

Adjust the discovery/integration tests so they expect the fixture app to resolve the real workspace plugin package instead of a hand-written fixture implementation.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-cli test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts tests/cli/collect-weixin.test.ts`
Expected: FAIL because fixture app wiring still points to the manually embedded plugin package.

**Step 3: Write minimal implementation**

Choose one source of truth for installed-package discovery testing:
- Recommended: `file:` dependency from `tests/fixtures/discovery-app/package.json` to `packages/clipper-plugin-weixin`
- Alternative: generate/copy build artifacts into the fixture app during test setup

Then remove the old duplicated fixture plugin source so the real workspace package becomes authoritative.

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-cli test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts tests/cli/collect-weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/fixtures/discovery-app tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts tests/cli/collect-weixin.test.ts
 git commit -m "test: wire discovery fixtures to workspace plugin"
```

### Task 6: Add package-level publish/build verification with failing tests first

**Files:**
- Create: `packages/clipper-plugin-weixin/tests/package-metadata.test.ts`
- Create: `packages/clipper-plugin-weixin/tests/package-publish.test.ts`
- Modify: package scripts in both workspace packages
- Modify: root README or add top-level workspace docs if needed

**Step 1: Write the failing test**

Add package metadata/publish tests for the plugin package asserting it is publish-ready and exports plugin metadata correctly.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter clipper-plugin-weixin test -- tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: FAIL until package metadata is fully filled in.

**Step 3: Write minimal implementation**

- Complete plugin package metadata
- Ensure both packages build independently
- Ensure root docs explain package-specific commands and publish targets

**Step 4: Run test to verify it passes**

Run: `pnpm --filter clipper-plugin-weixin test -- tests/package-metadata.test.ts tests/package-publish.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/clipper-plugin-weixin/package.json packages/clipper-plugin-weixin/tests root-docs
 git commit -m "docs: finalize workspace package publishing"
```

### Task 7: Run full workspace verification

**Files:**
- Modify: no source files expected

**Step 1: Install workspace dependencies**

Run: `pnpm install`
Expected: PASS

**Step 2: Run package-local tests**

Run: `pnpm --filter clipper-cli test`
Run: `pnpm --filter clipper-plugin-weixin test`
Expected: PASS

**Step 3: Run workspace-wide tests**

Run: `pnpm -r test`
Expected: PASS

**Step 4: Run workspace-wide builds**

Run: `pnpm -r build`
Expected: PASS

**Step 5: Verify publish shape**

Run: `pnpm --filter clipper-cli pack --dry-run`
Run: `pnpm --filter clipper-plugin-weixin pack --dry-run`
Expected: PASS and each tarball contains only the intended files for that package

**Step 6: Commit**

```bash
git add -A
git commit -m "build: convert repo to workspace packages"
```
