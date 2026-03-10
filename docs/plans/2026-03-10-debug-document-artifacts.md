# Debug Document Artifacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `clipper --debug` write a rich `document.json` containing the normalized document plus concise debug metadata at the top level and under `diagnostics.debug`.

**Architecture:** Keep the normalized document unchanged, but build a debug-specific document snapshot in the collect command using the already-populated request, response, runtime, and pipeline context. Reuse summaries derived from `context.request` and `context.response` so `document.json` stays concise and consistent with the dedicated request/response artifacts.

**Tech Stack:** TypeScript, Vitest, clipper CLI pipeline/debug artifacts.

---

### Task 1: Add a failing document debug regression test

**Files:**
- Modify: `tests/cli/collect-debug.test.ts`
- Modify later: `packages/clipper-cli/src/cli/commands/collect.ts`

**Step 1: Write the failing test**

Expand the collect debug test to read `document.json` and assert it includes both top-level metadata and `diagnostics.debug`, for example:

```ts
const document = JSON.parse(readFileSync(join(result.debugDir!, 'document.json'), 'utf8'))

expect(document).toMatchObject({
  title: 'Debug Title',
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
  requestSummary: {
    url: 'https://example.com/post',
    method: 'GET',
    timeout: undefined
  },
  responseSummary: {
    url: 'https://example.com/post',
    status: 200,
    statusText: 'OK',
    ok: true,
    redirected: false,
    rawHtmlSource: 'request'
  },
  diagnostics: {
    debug: {
      pipeline: {
        collector: 'generic'
      }
    }
  }
})
```

Use exact assertions for deterministic fields and explicit checks for header key arrays.

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts`
Expected: FAIL because `document.json` currently contains only the normalized document.

**Step 3: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 2: Build concise document debug summaries

**Files:**
- Modify: `packages/clipper-cli/src/cli/commands/collect.ts`
- Test: `tests/cli/collect-debug.test.ts`

**Step 1: Write minimal implementation**

Build a debug-document snapshot before calling `writeDebugArtifacts`:

```ts
const debugDocument = {
  ...document,
  runtime: {
    cwd: context.runtime.cwd,
    debug: context.runtime.debug
  },
  pipeline: context.request.pipeline,
  clientFallback: context.request.clientFallback,
  requestSummary: {
    url: context.request.url,
    method: context.request.method,
    headerKeys: Object.keys(context.request.headers ?? {}),
    timeout: context.request.timeout
  },
  responseSummary: {
    url: context.response.url,
    status: context.response.status,
    statusText: context.response.statusText,
    ok: context.response.ok,
    redirected: context.response.redirected,
    headerKeys: Object.keys(context.response.headers ?? {}),
    rawHtmlSource: context.response.content?.rawHtmlSource
  },
  diagnostics: {
    ...document.diagnostics,
    debug: {
      runtime: {
        cwd: context.runtime.cwd,
        debug: context.runtime.debug
      },
      pipeline: context.request.pipeline,
      clientFallback: context.request.clientFallback,
      requestSummary: { ... },
      responseSummary: { ... }
    }
  }
}
```

Keep the summaries small and avoid copying full bodies or full header maps.

**Step 2: Run focused tests to green**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 3: Refactor only if needed**

If summary construction duplicates too much structure, extract a tiny local helper inside the collect command module. Do not broaden scope.

**Step 4: Do not commit**

Do not commit unless explicitly requested by the user.

### Task 3: Run focused verification

**Files:**
- Test: `tests/cli/collect-debug.test.ts`
- Test: `tests/core/debug.test.ts`
- Build inputs: `packages/clipper-cli/src/cli/commands/collect.ts`
- Build inputs: `packages/clipper-cli/src/types/document.ts`

**Step 1: Run focused debug tests**

Run: `pnpm exec vitest run --config vitest.workspace-root.config.ts tests/cli/collect-debug.test.ts tests/core/debug.test.ts`
Expected: PASS.

**Step 2: Run workspace build**

Run: `pnpm -r build`
Expected: PASS, or report unrelated pre-existing failures without fixing them.

**Step 3: Report exactly what `document.json` now contains**

Summarize the top-level debug fields and the `diagnostics.debug` summaries now present.

**Step 4: Do not commit**

Do not commit unless explicitly requested by the user.
