# Debug Response Artifacts Design

**Goal:** Make `--debug` write a richer `response.json` that captures both the raw HTTP response details and the response-side diagnostic context, while keeping the full body.

**Scope:** Expand response-side debug artifact generation in `packages/clipper-cli` so `response.json` includes HTTP response fields, runtime and pipeline metadata, fallback diagnostics, and content source information. Keep the existing `body` intact.

## Problem

`response.json` currently only mirrors the immediate request result shape: `status`, `headers`, and `body`. That leaves out useful debugging context such as whether the response redirected, what the final URL was, whether the response was considered `ok`, and whether the pipeline ultimately used the raw request response or switched to client fallback content.

## Chosen Approach

Introduce a richer response-debug snapshot assembled from the request/fetch layer and the pipeline context, then write that snapshot into `response.json`.

The snapshot will include:

- HTTP response fields such as `url`, `status`, `statusText`, `ok`, `redirected`, `headers`, and `body`
- runtime context such as `cwd` and `debug`
- pipeline/plugin metadata such as selected `collector`, `transformer`, and `publisher`
- fallback metadata such as whether client fallback ran and which client options were used
- content-source metadata such as whether `raw.html` currently reflects the direct request or client fallback output

This keeps `response.json` as the response-side twin of `request.json` while preserving `raw.html` and `cleaned.html` as content artifacts.

## Rejected Alternatives

### 1. Keep `response.json` HTTP-only and add a separate `response-meta.json`

Rejected because debugging a single collection flow becomes more fragmented, and the user explicitly wants a response artifact with similarly rich detail.

### 2. Add only a few HTTP fields like `statusText` and `redirected`

Rejected because it would still omit the pipeline and fallback context that often explains why the final content differs from the direct HTTP body.

## File Changes

- Modify `packages/clipper-cli/src/core/request.ts`
  - extend the response result shape with richer HTTP response metadata
- Modify `packages/clipper-cli/src/core/fetcher.ts`
  - capture final URL, `statusText`, `ok`, and `redirected` from `fetch`
- Modify `packages/clipper-cli/src/types/context.ts`
  - expand response state to include the richer response snapshot plus diagnostic metadata
- Modify `packages/clipper-cli/src/core/pipeline.ts`
  - persist response-side metadata and annotate content source / fallback state
- Modify `packages/clipper-cli/src/cli/commands/collect.ts`
  - write the full response snapshot into `response.json`
- Modify tests in `tests/cli/collect-debug.test.ts` and `tests/core/debug.test.ts`
  - add assertions for the richer response shape

## Testing Strategy

Use TDD:

1. Expand the collect debug test so it expects rich fields in `response.json`.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimal response metadata plumbing.
4. Re-run the focused tests until they pass.
5. Re-run the related debug tests and build.

## Notes

- Keep the full `body` in `response.json`.
- Prefer actual runtime values over reconstructed guesses.
- When a field is unavailable on a given path, omit it or leave it undefined rather than inventing values.
