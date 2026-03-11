# Global and Self Plugin Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend plugin discovery to support two new scenarios: (1) global npm-installed plugins (`npm i -g clipper-plugin-weixin`), and (2) running `clipper-cli` from inside a plugin's own source directory during development.

**Architecture:** Add two new discovery phases to `discoverPlugins()` in `config.ts`. Phase 1 (self-discovery): if `cwd`'s own `package.json` matches the plugin pattern, treat it as a plugin directly. Phase 2 (global discovery): run `npm root -g` to find the global `node_modules`, scan it for packages matching `clipper-plugin-*` or having `clipper.plugin: true`. Both phases skip packages already found in the project-dependency phase.

**Tech Stack:** Node.js `child_process.execSync`, existing `toManifest()` / `readJsonFile()` helpers, vitest for tests.

---

### Task 1: Self-discovery — cwd is a plugin package

When the user runs `clipper-cli` from inside `packages/clipper-plugin-weixin/` (or any plugin root), that directory's own `package.json` should be discovered as a plugin, even if it's not listed in any `dependencies`.

**Files:**
- Modify: `packages/clipper-cli/src/core/config.ts:248-302` (inside `discoverPlugins`)
- Test: `tests/core/plugin-discovery.test.ts`

**Step 1: Write the failing test**

Add to `tests/core/plugin-discovery.test.ts`:

```ts
it('discovers the plugin when cwd is the plugin package root itself', async () => {
  // workspaceWeixinPath is already defined at the top of the test file
  const result = await discoverPlugins({ cwd: workspaceWeixinPath })

  expect(result.discovered.map((p) => p.packageName)).toContain('clipper-plugin-weixin')
})

it('loads collectors and transformers when cwd is the plugin package root', async () => {
  const result = await discoverPlugins({ cwd: workspaceWeixinPath, load: true })
  const weixinPlugin = result.loaded.find((p) => p.packageName === 'clipper-plugin-weixin')

  expect(weixinPlugin?.collectors.map((c) => c.name)).toContain('weixin')
  expect(weixinPlugin?.transformers.map((t) => t.name)).toContain('weixin')
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts
```

Expected: FAIL — cwd self-discovery not implemented yet.

**Step 3: Implement self-discovery in `discoverPlugins`**

In `config.ts`, after the existing `for` loop over `dependencyEntries` (before the `if (!options.load)` check), add:

```ts
// Phase 2: self-discovery — cwd itself may be a plugin package
const cwdManifestPath = join(cwd, 'package.json')
try {
  const cwdPackageJson = await readJsonFile<Record<string, unknown>>(cwdManifestPath)
  const cwdPackageName = typeof cwdPackageJson.name === 'string' ? cwdPackageJson.name : undefined
  if (cwdPackageName) {
    const selfManifest = toManifest(cwdPackageJson, cwdPackageName)
    const alreadyDiscovered = discovered.some((d) => d.packageName === cwdPackageName)
    if (selfManifest && !alreadyDiscovered) {
      const resolvedManifestPath = await realpath(cwdManifestPath)
      discovered.push({
        packageName: cwdPackageName,
        packagePath: dirname(resolvedManifestPath),
        manifestPath: resolvedManifestPath,
        manifest: selfManifest
      })
      diagnostics.push({
        packageName: cwdPackageName,
        stage: 'manifest',
        status: 'discovered',
        message: 'plugin manifest discovered (self)'
      })
    }
  }
} catch {
  // cwd has no package.json or it is not readable — ignore
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts
```

Expected: all tests PASS including the two new ones.

**Step 5: Commit**

```bash
git add packages/clipper-cli/src/core/config.ts tests/core/plugin-discovery.test.ts
git commit -m "feat: discover plugin when cwd is the plugin package root (self-discovery)"
```

---

### Task 2: Global discovery — plugins installed via `npm i -g`

When the user runs `npm i -g clipper-plugin-weixin`, the plugin lands in the global `node_modules` (e.g. `$(npm root -g)/clipper-plugin-weixin`). Scan that directory after project and self discovery.

**Files:**
- Modify: `packages/clipper-cli/src/core/config.ts`
- Test: `tests/core/plugin-discovery.test.ts`

**Step 1: Add a helper to get the global node_modules path**

Add near the top of `config.ts` (after the imports):

```ts
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
```

Add this helper function:

```ts
function getGlobalNodeModulesPath(): string | undefined {
  try {
    const result = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return result.trim()
  } catch {
    return undefined
  }
}
```

**Step 2: Write the failing test**

This test creates a fake global node_modules in a temp dir and passes it via a test-only option. First update the `discoverPlugins` signature to accept `globalNodeModulesPath` (for testing):

In `config.ts`, change the options type:
```ts
export async function discoverPlugins(options: {
  cwd?: string
  load?: boolean
  globalNodeModulesPath?: string  // injectable for tests
} = {}): Promise<PluginDiscoveryResult>
```

Add to `tests/core/plugin-discovery.test.ts`:

```ts
it('discovers plugins installed in the global node_modules', async () => {
  // Build a minimal fake global node_modules with the workspace weixin plugin symlinked
  const fakeGlobalDir = mkdtempSync(join(tmpdir(), 'clipper-global-'))
  const fakePluginPath = join(fakeGlobalDir, 'clipper-plugin-weixin')
  symlinkSync(workspaceWeixinPath, fakePluginPath, 'dir')

  // Use a cwd that has NO package.json referencing the plugin
  const emptyCwd = mkdtempSync(join(tmpdir(), 'clipper-empty-'))
  writeFileSync(join(emptyCwd, 'package.json'), JSON.stringify({ name: 'empty-app', private: true }))

  const result = await discoverPlugins({
    cwd: emptyCwd,
    globalNodeModulesPath: fakeGlobalDir
  })

  expect(result.discovered.map((p) => p.packageName)).toContain('clipper-plugin-weixin')
})

it('loads plugin collectors and transformers from global node_modules', async () => {
  const fakeGlobalDir = mkdtempSync(join(tmpdir(), 'clipper-global-load-'))
  const fakePluginPath = join(fakeGlobalDir, 'clipper-plugin-weixin')
  symlinkSync(workspaceWeixinPath, fakePluginPath, 'dir')

  const emptyCwd = mkdtempSync(join(tmpdir(), 'clipper-empty-load-'))
  writeFileSync(join(emptyCwd, 'package.json'), JSON.stringify({ name: 'empty-app', private: true }))

  const result = await discoverPlugins({
    cwd: emptyCwd,
    load: true,
    globalNodeModulesPath: fakeGlobalDir
  })

  const weixinPlugin = result.loaded.find((p) => p.packageName === 'clipper-plugin-weixin')
  expect(weixinPlugin?.collectors.map((c) => c.name)).toContain('weixin')
})
```

**Step 3: Run test to verify it fails**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts
```

Expected: FAIL — global discovery not implemented yet.

**Step 4: Implement global discovery in `discoverPlugins`**

After the self-discovery block (Task 1), add:

```ts
// Phase 3: global node_modules discovery
const globalNodeModules = options.globalNodeModulesPath ?? getGlobalNodeModulesPath()
if (globalNodeModules) {
  try {
    const entries = readdirSync(globalNodeModules, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      const packageName = entry.name
      const alreadyDiscovered = discovered.some((d) => d.packageName === packageName)
      if (alreadyDiscovered) continue
      const manifestPath = join(globalNodeModules, packageName, 'package.json')
      try {
        const packageJson = await readJsonFile<Record<string, unknown>>(manifestPath)
        if (typeof packageJson.name === 'string' && packageJson.name !== packageName) continue
        const manifest = toManifest(packageJson, packageName)
        if (!manifest) continue
        const resolvedManifestPath = await realpath(manifestPath)
        discovered.push({
          packageName,
          packagePath: dirname(resolvedManifestPath),
          manifestPath: resolvedManifestPath,
          manifest
        })
        diagnostics.push({
          packageName,
          stage: 'manifest',
          status: 'discovered',
          message: 'plugin manifest discovered (global)'
        })
      } catch {
        // not a valid package, skip
      }
    }
  } catch {
    // global node_modules not readable, skip
  }
}
```

**Step 5: Run tests to verify they pass**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts
```

Expected: all tests PASS.

**Step 6: Commit**

```bash
git add packages/clipper-cli/src/core/config.ts tests/core/plugin-discovery.test.ts
git commit -m "feat: discover plugins installed in global node_modules"
```

---

### Task 3: Verify the plugins CLI command reflects global and self-discovered plugins

The `listPlugins` command calls `resolveRuntimeConfig` which calls `discoverPlugins`. No changes needed in `plugins.ts` — just verify with tests.

**Files:**
- Test: `tests/cli/plugins-list.test.ts`

**Step 1: Write the failing tests**

Add to `tests/cli/plugins-list.test.ts`:

```ts
it('includes self-discovered weixin plugin when cwd is the plugin root', async () => {
  const result = await listPlugins({ cwd: workspaceWeixinPath })

  expect(result.collectors).toContain('weixin')
  expect(result.transformers).toContain('weixin')
})

it('includes globally installed plugins in the plugins list', async () => {
  const fakeGlobalDir = mkdtempSync(join(tmpdir(), 'clipper-global-cli-'))
  const fakePluginPath = join(fakeGlobalDir, 'clipper-plugin-weixin')
  symlinkSync(workspaceWeixinPath, fakePluginPath, 'dir')

  const emptyCwd = mkdtempSync(join(tmpdir(), 'clipper-empty-cli-'))
  writeFileSync(join(emptyCwd, 'package.json'), JSON.stringify({ name: 'empty-app', private: true }))

  const result = await listPlugins({ cwd: emptyCwd, globalNodeModulesPath: fakeGlobalDir })

  expect(result.collectors).toContain('weixin')
})
```

Note: `listPlugins` needs to accept `globalNodeModulesPath` and pass it through to `discoverPlugins`. Check its signature and update if needed.

**Step 2: Check and update `listPlugins` signature if needed**

Open `packages/clipper-cli/src/cli/commands/plugins.ts`. If `listPlugins` accepts a `cwd` option, also add `globalNodeModulesPath?: string` and pass it to `resolveRuntimeConfig` / `discoverPlugins`.

**Step 3: Run tests to verify they fail, then pass after fix**

```bash
pnpm -r build && vitest run tests/cli/plugins-list.test.ts
```

Fix any signature issues, then run again until PASS.

**Step 4: Commit**

```bash
git add packages/clipper-cli/src/cli/commands/plugins.ts tests/cli/plugins-list.test.ts
git commit -m "test: verify global and self-discovered plugins appear in plugins list command"
```

---

### Task 4: Handle scoped packages in global node_modules

Global `node_modules` can contain scoped packages under `@scope/clipper-plugin-*`. The `readdirSync` loop only reads top-level entries; scoped packages live in a `@scope/` subdirectory.

**Files:**
- Modify: `packages/clipper-cli/src/core/config.ts` (global discovery block)
- Test: `tests/core/plugin-discovery.test.ts`

**Step 1: Write the failing test**

```ts
it('discovers scoped clipper plugins from global node_modules', async () => {
  const fakeGlobalDir = mkdtempSync(join(tmpdir(), 'clipper-global-scoped-'))
  const scopeDir = join(fakeGlobalDir, '@myscope')
  mkdirSync(scopeDir, { recursive: true })
  const fakePluginPath = join(scopeDir, 'clipper-plugin-weixin')
  symlinkSync(workspaceWeixinPath, fakePluginPath, 'dir')

  const emptyCwd = mkdtempSync(join(tmpdir(), 'clipper-empty-scoped-'))
  writeFileSync(join(emptyCwd, 'package.json'), JSON.stringify({ name: 'empty-app', private: true }))

  const result = await discoverPlugins({
    cwd: emptyCwd,
    globalNodeModulesPath: fakeGlobalDir
  })

  expect(result.discovered.map((p) => p.packageName)).toContain('@myscope/clipper-plugin-weixin')
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts --reporter=verbose
```

Expected: the scoped test FAILS (scoped packages not discovered).

**Step 3: Extend global discovery to handle scoped packages**

Replace the `entries` loop in the global discovery block with:

```ts
async function collectGlobalPackageNames(globalNodeModules: string): Promise<Array<{ packageName: string; manifestPath: string }>> {
  const results: Array<{ packageName: string; manifestPath: string }> = []
  let entries: Dirent[]
  try {
    entries = readdirSync(globalNodeModules, { withFileTypes: true })
  } catch {
    return results
  }
  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
    if (entry.name.startsWith('@')) {
      // scoped packages: read the scope dir
      try {
        const scopeEntries = readdirSync(join(globalNodeModules, entry.name), { withFileTypes: true })
        for (const scopedEntry of scopeEntries) {
          if (!scopedEntry.isDirectory() && !scopedEntry.isSymbolicLink()) continue
          results.push({
            packageName: `${entry.name}/${scopedEntry.name}`,
            manifestPath: join(globalNodeModules, entry.name, scopedEntry.name, 'package.json')
          })
        }
      } catch {
        // skip unreadable scoped dirs
      }
    } else {
      results.push({
        packageName: entry.name,
        manifestPath: join(globalNodeModules, entry.name, 'package.json')
      })
    }
  }
  return results
}
```

Also add `Dirent` to the `readdirSync` import. Update the global discovery phase to use `collectGlobalPackageNames` instead of the inline loop.

**Step 4: Run all discovery tests**

```bash
pnpm -r build && vitest run tests/core/plugin-discovery.test.ts
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add packages/clipper-cli/src/core/config.ts tests/core/plugin-discovery.test.ts
git commit -m "feat: support scoped packages in global node_modules discovery"
```

---

### Task 5: Full test suite + README update

**Files:**
- Run: all workspace tests
- Modify: `README.md` (usage section for global install)

**Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: all tests PASS with no regressions.

**Step 2: Update README**

Find the installation / usage section in `README.md`. Add a note explaining the two supported install scenarios:

```markdown
## 插件安装方式

**方式一：全局安装（生产使用）**

```bash
npm i -g clipper-cli
npm i -g clipper-plugin-weixin
clipper-cli plugins  # 可以看到 weixin 采集器
```

**方式二：在插件目录中开发**

在插件包根目录（含 `package.json` 且名称匹配 `clipper-plugin-*`）下直接运行 `clipper-cli`，CLI 会自动将当前目录识别为插件：

```bash
cd packages/clipper-plugin-weixin
clipper-cli plugins  # 自动识别当前目录为插件
```
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document global install and dev-mode plugin discovery"
```
