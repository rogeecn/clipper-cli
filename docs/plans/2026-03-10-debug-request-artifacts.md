# Debug Request Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `clipper --debug` write a rich `request.json` containing both outbound request details and CLI/runtime context.

**Architecture:** Thread request metadata through the request and pipeline layers so the debug artifact is assembled from real execution data instead of a CLI-only stub. Keep `response.json` as the response-side artifact and treat `request.json` as the request-side snapshot including request options, runtime inputs, selected plugins, and fallback/client state.

**Tech Stack:** TypeScript, Vitest, Node.js fetch, clipper CLI pipeline/debug artifacts.

---

### Task 1: Add a failing debug artifact regression test

**Files:**
- Modify: `tests/cli/collect-debug.test.ts`
- Modify later: `packages/clipper-cli/src/cli/commands/collect.ts`
- Modify later: `packages/clipper-cli/src/core/request.ts`
- Modify later: `packages/clipper-cli/src/core/pipeline.ts`

**Step 1: Write the failing test**

Expand the collect debug test to read `request.json` and assert it includes a rich request snapshot, for example:

```ts
const request = JSON.parse(readFileSync(join(result.debugDir!, 'request.json'), 'utf8'))

expect(request).toMatchObject({
  url: 'https://example.com/post',
  method: 'GET',
  runtime: {
    cwd: dir,
    debug: true,
    input: {
      url: 'https://example.com/post',
      outputDir: dir,
      publisher: 'markdown'
    }
  },
  pipeline: {
    collector: expect.any(String),
    transformer: expect.any(String),
    publisher: 'markdown'
  },
  clientFallback: {
    usedFallback: false
  }
})
```

Use exact assertions for fields that are deterministic in this test.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts`
Expected: FAIL because `request.json` currently only contains `{ url }`.

**Step 3: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 2: Thread request metadata through the request layer

**Files:**
- Modify: `packages/clipper-cli/src/core/request.ts`
- Modify: `packages/clipper-cli/src/core/fetcher.ts`
- Test: `tests/cli/collect-debug.test.ts`

**Step 1: Write minimal implementation**

Extend the request types so the request runner can carry both the response data and a request snapshot.

```ts
export interface RequestSnapshot {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
  redirect?: string
  referrer?: string
  referrerPolicy?: string
  mode?: string
  credentials?: string
  cache?: string
  integrity?: string
}

export interface RequestResult {
  request: RequestSnapshot
  status: number
  headers: Record<string, string>
  body: string
}
```

Allow the fetcher to accept request options and return the effective request snapshot. For the current direct fetch path, default `method` to `GET` and only include additional fields when provided.

**Step 2: Run test to verify it passes or fails closer to green**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts`
Expected: the failure moves from missing request fields toward missing runtime/pipeline metadata.

**Step 3: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 3: Persist runtime and pipeline metadata into debug output

**Files:**
- Modify: `packages/clipper-cli/src/types/context.ts`
- Modify: `packages/clipper-cli/src/core/pipeline.ts`
- Modify: `packages/clipper-cli/src/cli/commands/collect.ts`
- Test: `tests/cli/collect-debug.test.ts`
- Test: `tests/core/debug.test.ts`

**Step 1: Write minimal implementation**

Expand context request state and populate it during pipeline execution. Include:

```ts
request: {
  url: options.url,
  method: 'GET',
  headers,
  body,
  runtime: {
    cwd,
    debug,
    input: { url, outputDir, publisher, configPath }
  },
  pipeline: {
    collector: collector.name,
    transformer: transformer.name,
    publisher: publisher.name
  },
  clientFallback: {
    usedFallback: Boolean(ctx.client.usedFallback),
    options: ctx.client.options
  }
}
```

Keep field names plain and JSON-friendly. Reuse actual context values rather than rebuilding parallel state where possible.

**Step 2: Run focused tests to green**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 3: Refactor only if needed**

If request-state assembly becomes noisy, extract a tiny helper local to the CLI or pipeline layer. Do not broaden scope beyond debug artifacts.

**Step 4: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 4: Run focused verification

**Files:**
- Test: `tests/cli/collect-debug.test.ts`
- Test: `tests/core/debug.test.ts`
- Build inputs: `packages/clipper-cli/src/core/request.ts`
- Build inputs: `packages/clipper-cli/src/core/fetcher.ts`
- Build inputs: `packages/clipper-cli/src/core/pipeline.ts`
- Build inputs: `packages/clipper-cli/src/cli/commands/collect.ts`

**Step 1: Run the focused debug tests**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 2: Run package build if needed by the workspace flow**

Run: `pnpm -r build`
Expected: PASS, or report any unrelated pre-existing failures without fixing them.

**Step 3: Report exactly what `request.json` now contains**

Summarize the request fields, runtime metadata, pipeline/plugin metadata, and fallback info now present in the artifact.

**Step 4: Do not commit**

Do not commit unless explicitly requested by the user.
