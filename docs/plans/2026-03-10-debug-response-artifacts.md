# Debug Response Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `clipper --debug` write a rich `response.json` containing both raw HTTP response details and response-side diagnostic context.

**Architecture:** Thread richer HTTP response metadata through the request layer and persist response-side diagnostics in the pipeline context so the debug artifact reflects real execution data instead of a minimal response stub. Keep `response.json` as the response-side twin to `request.json`, including HTTP fields, pipeline/runtime metadata, fallback state, and content-source annotations while preserving the full body.

**Tech Stack:** TypeScript, Vitest, Node.js fetch, clipper CLI pipeline/debug artifacts.

---

### Task 1: Add a failing response debug regression test

**Files:**
- Modify: `tests/cli/collect-debug.test.ts`
- Modify later: `packages/clipper-cli/src/core/request.ts`
- Modify later: `packages/clipper-cli/src/core/fetcher.ts`
- Modify later: `packages/clipper-cli/src/core/pipeline.ts`

**Step 1: Write the failing test**

Expand the collect debug test to read `response.json` and assert it includes a rich response snapshot, for example:

```ts
const response = JSON.parse(readFileSync(join(result.debugDir!, 'response.json'), 'utf8'))

expect(response).toMatchObject({
  url: 'https://example.com/post',
  status: 200,
  statusText: 'OK',
  ok: true,
  redirected: false,
  headers: {
    'content-type': 'text/html'
  },
  runtime: {
    cwd: dir,
    debug: true
  },
  pipeline: {
    collector: 'generic',
    transformer: 'default',
    publisher: 'markdown'
  },
  clientFallback: {
    usedFallback: false
  },
  content: {
    rawHtmlSource: 'request'
  }
})
```

Also assert that `body` still contains the full HTML.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts`
Expected: FAIL because `response.json` currently lacks the richer fields.

**Step 3: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 2: Thread richer HTTP response metadata through fetch

**Files:**
- Modify: `packages/clipper-cli/src/core/request.ts`
- Modify: `packages/clipper-cli/src/core/fetcher.ts`
- Test: `tests/cli/collect-debug.test.ts`

**Step 1: Write minimal implementation**

Extend the response result shape to include `url`, `statusText`, `ok`, and `redirected`.

```ts
export interface ResponseSnapshot {
  url?: string
  status: number
  statusText?: string
  ok?: boolean
  redirected?: boolean
  headers: Record<string, string>
  body: string
}
```

Make the fetcher populate these fields from the native `Response` object.

**Step 2: Run test to verify it moves closer to green**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts`
Expected: the failure shifts from missing HTTP fields toward missing runtime/pipeline/fallback metadata.

**Step 3: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 3: Persist response diagnostics into debug output

**Files:**
- Modify: `packages/clipper-cli/src/types/context.ts`
- Modify: `packages/clipper-cli/src/core/pipeline.ts`
- Modify: `packages/clipper-cli/src/cli/commands/collect.ts`
- Test: `tests/cli/collect-debug.test.ts`
- Test: `tests/core/debug.test.ts`

**Step 1: Write minimal implementation**

Expand context response state and populate it during pipeline execution. Include:

```ts
response: {
  url,
  status,
  statusText,
  ok,
  redirected,
  headers,
  body,
  runtime: {
    cwd,
    debug
  },
  pipeline: {
    collector: collector.name,
    transformer: transformer.name,
    publisher: publisher.name
  },
  clientFallback: {
    usedFallback: Boolean(ctx.client.usedFallback),
    options: ctx.client.options
  },
  content: {
    rawHtmlSource: ctx.client.usedFallback ? 'client-fallback' : 'request'
  }
}
```

Keep the direct response body intact even when fallback occurs later.

**Step 2: Run focused tests to green**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 3: Refactor only if needed**

If request/response artifact assembly starts duplicating metadata construction, extract a tiny local helper. Do not broaden scope beyond debug artifacts.

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

**Step 1: Run focused debug tests**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 2: Run workspace build**

Run: `pnpm -r build`
Expected: PASS, or report unrelated pre-existing failures without fixing them.

**Step 3: Report exactly what `response.json` now contains**

Summarize the HTTP response fields, runtime/pipeline metadata, fallback diagnostics, and content-source fields now present.

**Step 4: Do not commit**

Do not commit unless explicitly requested by the user.
