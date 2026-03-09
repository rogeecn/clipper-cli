# Plugin Auto-Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace config-based plugin registration with automatic discovery and loading of installed plugin packages, while preserving support for unpublished local plugins installed via workspace, `file:`, or link workflows.

**Architecture:** Add a dedicated discovery pipeline that enumerates project-visible dependency packages, validates a Clipper plugin manifest from each candidate package, dynamically imports valid plugin entries, and merges loaded contributions with built-in plugins. Keep user config focused on behavioral overrides such as disabling or reordering discovered plugins rather than registering plugin objects directly.

**Tech Stack:** Node.js, TypeScript, npm module resolution, Vitest

---

### Task 1: Expand plugin type contracts

**Files:**
- Modify: `src/types/plugin.ts`
- Test: `tests/types/plugin.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { ClipperPluginManifest, PluginDiagnostic } from '../../src/types/plugin'

describe('plugin discovery types', () => {
  it('supports manifest and diagnostic structures', () => {
    const manifest: ClipperPluginManifest = {
      packageName: 'clipper-plugin-example',
      plugin: true,
      apiVersion: 1,
      kind: ['publisher']
    }

    const diagnostic: PluginDiagnostic = {
      packageName: 'clipper-plugin-example',
      stage: 'manifest',
      status: 'failed',
      message: 'invalid manifest'
    }

    expect(manifest.apiVersion).toBe(1)
    expect(diagnostic.status).toBe('failed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/types/plugin.test.ts`
Expected: FAIL with missing exported types

**Step 3: Write minimal implementation**

Add discovery-oriented types beside the existing runtime plugin contracts:

```ts
export interface ClipperPluginManifest {
  packageName: string
  plugin: boolean
  apiVersion: number
  kind?: Array<'collector' | 'transformer' | 'publisher'>
  entry?: string
}

export interface PluginDiagnostic {
  packageName: string
  stage: 'resolve' | 'manifest' | 'import' | 'validate'
  status: 'discovered' | 'loaded' | 'skipped' | 'failed'
  message: string
}
```

Also add types for `DiscoveredPlugin`, `LoadedPluginModule`, and `PluginDiscoveryResult` so later tasks can share them.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/types/plugin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/plugin.ts tests/types/plugin.test.ts
git commit -m "feat: add plugin discovery type contracts"
```

### Task 2: Add manifest parsing and candidate resolution

**Files:**
- Modify: `src/core/config.ts`
- Create: `tests/core/plugin-discovery.test.ts`
- Test: `tests/core/plugin-discovery.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { discoverPlugins } from '../../src/core/config'

describe('plugin discovery', () => {
  it('discovers manifest-based plugin candidates from project dependencies', async () => {
    const result = await discoverPlugins({ cwd: new URL('../fixtures/discovery-app', import.meta.url).pathname })

    expect(result.discovered.map(plugin => plugin.packageName)).toContain('clipper-plugin-local')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/plugin-discovery.test.ts`
Expected: FAIL with missing `discoverPlugins`

**Step 3: Write minimal implementation**

In `src/core/config.ts`:

- add a `discoverPlugins({ cwd })` function
- read the root `package.json`
- collect package names from `dependencies`, `optionalDependencies`, and optionally `devDependencies`
- resolve candidate package manifests with `require.resolve('<pkg>/package.json', { paths: [cwd] })`
- read each package manifest and keep packages that either match the naming convention or declare `clipper.plugin === true`

Keep this task limited to manifest discovery; do not import plugin modules yet.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/plugin-discovery.test.ts`
Expected: PASS for manifest discovery

**Step 5: Commit**

```bash
git add src/core/config.ts tests/core/plugin-discovery.test.ts
git commit -m "feat: discover plugin package manifests"
```

### Task 3: Load plugin modules and validate exports

**Files:**
- Modify: `src/core/config.ts`
- Modify: `src/types/plugin.ts`
- Modify: `tests/core/plugin-discovery.test.ts`
- Test: `tests/core/plugin-discovery.test.ts`

**Step 1: Write the failing test**

```ts
it('loads a discovered plugin entry and returns publisher contributions', async () => {
  const result = await discoverPlugins({ cwd: fixtureCwd, load: true })

  expect(result.loaded.flatMap(plugin => plugin.publishers.map(item => item.name))).toContain('fixture-publisher')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/plugin-discovery.test.ts`
Expected: FAIL because discovery does not yet import modules

**Step 3: Write minimal implementation**

Extend discovery with loading:

- resolve entry from `clipper.entry`, `exports`, or `main`
- dynamically `import()` the entry
- accept `default` or named `plugin` export
- validate exported `name`, `collectors`, `transformers`, and `publishers`
- record load diagnostics instead of throwing for single-plugin failures

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/plugin-discovery.test.ts`
Expected: PASS for module loading

**Step 5: Commit**

```bash
git add src/core/config.ts src/types/plugin.ts tests/core/plugin-discovery.test.ts
git commit -m "feat: load discovered plugin modules"
```

### Task 4: Merge discovered plugins into runtime config

**Files:**
- Modify: `src/core/config.ts`
- Modify: `src/core/defaults.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { listPlugins } from '../../src/cli/commands/plugins.js'

describe('plugins list command', () => {
  it('includes auto-discovered plugin names alongside built-ins', async () => {
    const result = await listPlugins({ cwd: fixtureCwd })

    expect(result.publishers).toContain('fixture-publisher')
    expect(result.publishers).toContain('markdown')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/plugins-list.test.ts`
Expected: FAIL because runtime config still only merges built-ins and config-defined plugins

**Step 3: Write minimal implementation**

Update `resolveRuntimeConfig` so it:

- loads built-in defaults
- loads discovered plugin contributions
- merges built-in and discovered plugins by name
- keeps user config only for behavior overrides or backward-compatible overrides during migration

If necessary, add a temporary compatibility layer so old config-based plugin arrays still work during the transition.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/plugins-list.test.ts`
Expected: PASS and discovered plugins appear in the list

**Step 5: Commit**

```bash
git add src/core/config.ts src/core/defaults.ts tests/cli/plugins-list.test.ts
git commit -m "feat: merge discovered plugins into runtime config"
```

### Task 5: Add diagnostics for skipped and failed plugins

**Files:**
- Modify: `src/cli/commands/plugins.ts`
- Modify: `src/types/plugin.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Write the failing test**

```ts
it('returns plugin diagnostics in verbose mode', async () => {
  const result = await listPlugins({ cwd: fixtureBrokenCwd, verbose: true })

  expect(result.diagnostics.some(item => item.status === 'failed')).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/plugins-list.test.ts`
Expected: FAIL because diagnostics are not returned

**Step 3: Write minimal implementation**

Enhance the plugins command so:

- default output keeps current grouped plugin names
- verbose mode includes skipped and failed plugin diagnostics
- each diagnostic includes package name, stage, status, and message

Do not add a new CLI command in this task; just extend the current listing path.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/plugins-list.test.ts`
Expected: PASS for verbose diagnostics

**Step 5: Commit**

```bash
git add src/cli/commands/plugins.ts src/types/plugin.ts tests/cli/plugins-list.test.ts
git commit -m "feat: expose plugin discovery diagnostics"
```

### Task 6: Add fixture packages for local unpublished plugin workflows

**Files:**
- Create: `tests/fixtures/discovery-app/package.json`
- Create: `tests/fixtures/discovery-app/node_modules/clipper-plugin-local/package.json`
- Create: `tests/fixtures/discovery-app/node_modules/clipper-plugin-local/index.js`
- Create: `tests/fixtures/discovery-broken-app/package.json`
- Create: `tests/fixtures/discovery-broken-app/node_modules/clipper-plugin-broken/package.json`
- Create: `tests/fixtures/discovery-broken-app/node_modules/clipper-plugin-broken/index.js`
- Test: `tests/core/plugin-discovery.test.ts`
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Write the failing fixture-dependent test**

Reuse the tests from Tasks 2, 3, and 5, but point them at fixture apps that simulate:

- a locally installed unpublished plugin
- a broken plugin manifest or export

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: FAIL until fixture packages exist

**Step 3: Write minimal implementation**

Create fixture package trees that look like installed dependencies. Example plugin entry:

```js
export default {
  name: 'fixture-plugin',
  publishers: [
    {
      name: 'fixture-publisher',
      resolveOutput() {
        return { entryFile: 'note.md', assetDir: 'assets' }
      }
    }
  ],
  collectors: [],
  transformers: []
}
```

Use one valid package and one intentionally invalid package to exercise diagnostics.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS for both valid and broken fixture scenarios

**Step 5: Commit**

```bash
git add tests/fixtures tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts
git commit -m "test: cover local plugin discovery scenarios"
```

### Task 7: Document the new plugin authoring workflow

**Files:**
- Modify: `README.md`
- Test: `README.md`

**Step 1: Write the failing documentation checklist**

Add a short checklist to verify README covers:

- package naming recommendation
- required `clipper` manifest fields
- local unpublished install methods (`file:`, workspace, link)
- command to inspect discovered plugins

**Step 2: Verify the checklist currently fails**

Run: `rg "clipper.plugin|file:|workspace|plugins list" README.md`
Expected: missing or incomplete matches

**Step 3: Write minimal implementation**

Update `README.md` with a plugin authoring section that shows:

- the recommended `package.json` manifest
- how automatic discovery works
- how to test local unpublished plugins
- how to diagnose plugin loading problems

**Step 4: Verify the documentation update**

Run: `rg "clipper.plugin|file:|workspace|plugins list" README.md`
Expected: matches for all required concepts

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: explain plugin auto-discovery workflow"
```

### Task 8: Run focused verification

**Files:**
- Test: `tests/types/plugin.test.ts`
- Test: `tests/core/plugin-discovery.test.ts`
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Run focused tests**

Run: `npm test -- tests/types/plugin.test.ts tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS

**Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS and updated types compile cleanly

**Step 4: Summarize any unrelated failures**

If any unrelated failures appear, document them before stopping rather than expanding scope.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: support automatic plugin discovery"
```