# Weixin Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the standalone `fetch.js` WeChat article flow into an auto-discovered external plugin package named `clipper-plugin-weixin`, with host-side transformer selection that automatically prefers a transformer matching the resolved collector name.

**Architecture:** Keep site detection and fallback policy in a `weixin` collector, move DOM cleanup and article extraction into a `weixin` transformer, and teach the host registry/collect flow to prefer a transformer whose `name` matches the selected collector. Package the plugin as a local fixture-style package first so discovery and end-to-end behavior can be verified inside this repository without changing the core package publishing shape.

**Tech Stack:** TypeScript, Vitest, JSDOM, Turndown, existing plugin auto-discovery runtime

---

### Task 1: Add failing host tests for transformer selection

**Files:**
- Modify: `tests/core/pipeline.test.ts`
- Create: `tests/core/registry.test.ts`
- Modify: `src/core/registry.ts`
- Modify: `src/cli/commands/collect.ts`

**Step 1: Write the failing test**

Add a registry test that expects a same-named transformer to be selected when a collector resolves to `weixin`, and a fallback to the first transformer when there is no name match.

```ts
import { describe, expect, it } from 'vitest'
import { createRegistry } from '../../src/core/registry.js'

describe('registry transformer resolution', () => {
  it('prefers a transformer whose name matches the collector name', () => {
    const registry = createRegistry({
      collectors: [{ name: 'weixin', match: () => true }],
      transformers: [
        { name: 'default', normalizeDocument: () => { throw new Error('unused') } },
        { name: 'weixin', normalizeDocument: () => { throw new Error('unused') } }
      ],
      publishers: []
    })

    expect(registry.resolveTransformerForCollector('weixin')?.name).toBe('weixin')
  })
})
```

Also extend `tests/core/pipeline.test.ts` or a new collect command test to verify a `weixin` transformer can be chosen without passing a transformer name explicitly.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/registry.test.ts tests/core/pipeline.test.ts`
Expected: FAIL because `resolveTransformerForCollector` does not exist yet and collect flow still always picks the first transformer.

**Step 3: Write minimal implementation**

Update `src/core/registry.ts` to expose a helper like `resolveTransformerForCollector(collectorName?: string)` that:
- returns the transformer whose `name` matches `collectorName`, if present
- otherwise returns the first transformer

Update `src/cli/commands/collect.ts` to use that helper after resolving the collector.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/registry.test.ts tests/core/pipeline.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/core/registry.test.ts tests/core/pipeline.test.ts src/core/registry.ts src/cli/commands/collect.ts
git commit -m "feat: match transformers to collectors"
```

### Task 2: Add failing plugin discovery fixture for `clipper-plugin-weixin`

**Files:**
- Modify: `tests/core/plugin-discovery.test.ts`
- Modify: `tests/cli/plugins-list.test.ts`
- Create: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/package.json`
- Create: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.js`
- Create: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.d.ts`

**Step 1: Write the failing test**

Extend discovery tests to assert that `clipper-plugin-weixin` is discovered and loaded from the fixture app, and extend plugin list tests to assert `weixin` appears in both collectors and transformers.

```ts
it('loads the weixin plugin collector and transformer from discovered packages', async () => {
  const result = await discoverPlugins({ cwd: fixtureCwd, load: true })

  expect(result.loaded.flatMap((plugin) => plugin.collectors.map((item) => item.name))).toContain('weixin')
  expect(result.loaded.flatMap((plugin) => plugin.transformers.map((item) => item.name))).toContain('weixin')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: FAIL because the fixture package does not exist yet.

**Step 3: Write minimal implementation**

Create a fixture plugin package under `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/` that exports:
- a `weixin` collector matching `mp.weixin.qq.com/s`
- a placeholder `weixin` transformer returning a minimal `ClipperDocument`
- empty publishers array

Ensure its `package.json` includes valid `clipper.plugin` metadata and `entry` points to `dist/index.js`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/core/plugin-discovery.test.ts tests/cli/plugins-list.test.ts tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin
git commit -m "test: add weixin plugin discovery fixture"
```

### Task 3: Add failing transformer behavior tests from `fetch.js`

**Files:**
- Create: `tests/fixtures/weixin/article.html`
- Create: `tests/fixtures/weixin/article-missing-js-content.html`
- Create: `tests/plugins/weixin.test.ts`
- Modify: `tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.js`

**Step 1: Write the failing test**

Create plugin tests that load the fixture plugin export and verify:
- `match()` only accepts Weixin article URLs
- `shouldFallback()` returns `true` when status is non-200 or `#js_content` is absent
- `normalizeDocument()` extracts `#js_content`
- OG metadata is mapped into `document.meta`
- article links inside the body are mapped to `document.meta.links`
- markdown contains cleaned article content

```ts
it('extracts js_content and article metadata', async () => {
  const document = await weixinTransformer.normalizeDocument({
    input: { url: 'https://mp.weixin.qq.com/s/example' },
    runtime: { debug: false, cwd: process.cwd() },
    request: {},
    response: {},
    client: {},
    artifacts: { rawHtml: htmlFixture }
  })

  expect(document.source).toBe('weixin')
  expect(document.content.html).toContain('article-content')
  expect(document.meta.title).toBeDefined()
  expect(document.meta.links).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: '相关阅读' })])
  )
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/plugins/weixin.test.ts`
Expected: FAIL because the fixture plugin currently only contains placeholder logic.

**Step 3: Write minimal implementation**

Implement the actual `weixin` collector/transformer inside the fixture plugin package using `JSDOM` and `Turndown`, following the approved design:
- strip `script/link/style`
- keep `og:*` metadata
- prefer `#js_content`
- preserve `src`/`data-src`/`href`
- drop empty non-image tags
- collect article links under `document.meta.links`
- generate markdown

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/plugins/weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/plugins/weixin.test.ts tests/fixtures/weixin tests/fixtures/discovery-app/node_modules/clipper-plugin-weixin/dist/index.js
git commit -m "feat: implement weixin plugin transformer"
```

### Task 4: Add failing end-to-end collect test for auto-selected plugin

**Files:**
- Create: `tests/cli/collect-weixin.test.ts`
- Modify: `src/cli/commands/collect.ts`
- Modify: `src/core/request.ts`
- Modify: `src/core/fetcher.ts`
- Modify: `tests/fixtures/discovery-app/clipper.config.mjs` (only if needed)

**Step 1: Write the failing test**

Add a collect command level test that runs the collect flow with:
- `cwd` pointing at `tests/fixtures/discovery-app`
- a mocked request result containing the Weixin HTML fixture
- a Weixin article URL

Assert that the returned result reports `collectorName === 'weixin'`, uses `document.source === 'weixin'`, and contains extracted markdown or meta links.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cli/collect-weixin.test.ts`
Expected: FAIL because the current collect command has no seam for injecting a fake request response, or because it still does not fully route into the discovered plugin behavior.

**Step 3: Write minimal implementation**

Introduce the smallest possible test seam for collect flow verification. Prefer one of:
- allow `runCollectCommand` to accept optional injected `requestRunner` / `clientRunner` in test-only call sites
- or factor the pipeline execution into a helper that can be called from tests with injected runners

Do not add a test-only production flag if ordinary dependency injection is sufficient.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cli/collect-weixin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/cli/collect-weixin.test.ts src/cli/commands/collect.ts src/core/request.ts src/core/fetcher.ts
git commit -m "test: cover weixin collect flow"
```

### Task 5: Document plugin usage and migration guidance

**Files:**
- Modify: `README.md`
- Modify: `tests/docs/readme.test.ts`
- Create: `examples/weixin/clipper.config.mjs` (only if the README needs a concrete sample)

**Step 1: Write the failing test**

Extend README tests to assert documentation includes:
- installing `clipper-plugin-weixin`
- auto-discovery behavior for site-specific plugins
- that a same-named transformer is auto-selected for matching collector/plugin flows

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/docs/readme.test.ts`
Expected: FAIL because README does not mention the new plugin flow.

**Step 3: Write minimal implementation**

Document:
- what `clipper-plugin-weixin` does
- how to install it locally
- that `clipper collect <weixin-url>` auto-selects the `weixin` collector and transformer after discovery
- how this replaces the old standalone `fetch.js` workflow

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/docs/readme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md tests/docs/readme.test.ts examples/weixin/clipper.config.mjs
git commit -m "docs: document weixin plugin workflow"
```

### Task 6: Run focused and full verification

**Files:**
- Modify: no source files expected

**Step 1: Run focused plugin and host tests**

Run: `npm test -- tests/core/registry.test.ts tests/core/pipeline.test.ts tests/core/plugin-discovery.test.ts tests/plugins/weixin.test.ts tests/cli/collect-weixin.test.ts tests/cli/plugins-list.test.ts tests/docs/readme.test.ts`
Expected: PASS

**Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Optional package verification**

Run: `npm pack --dry-run`
Expected: PASS and package output still includes intended shipped files only

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add weixin plugin integration"
```
