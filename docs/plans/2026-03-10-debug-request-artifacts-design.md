# Debug Request Artifacts Design

**Goal:** Make `--debug` write a much richer `request.json` that captures both the outbound request details and the CLI/runtime context, instead of only `{ "url": ... }`.

**Scope:** Expand debug artifact generation in `packages/clipper-cli` so `request.json` includes request inputs, fetch/init-like options, runtime metadata, pipeline/plugin selections, and fallback/client information. Do not add redaction in this change.

## Problem

The current debug writer is fine, but the object passed into it from `packages/clipper-cli/src/cli/commands/collect.ts` is hard-coded to `{ url: options.url }`. That means `request.json` does not help diagnose collector-specific request shaping, host runtime choices, or client fallback behavior.

## Chosen Approach

Introduce a richer request-debug snapshot assembled from the pipeline context and CLI inputs, then write that snapshot into `request.json`.

The snapshot will include:

- request target fields such as `url`, `method`, `headers`, `body`, and other fetch-style options when available
- runtime context such as `cwd`, `debug`, CLI command inputs, and config path
- pipeline/plugin metadata such as selected `collector`, `transformer`, and `publisher`
- fallback metadata such as whether client fallback ran and which client options were used

This keeps `request.json` as the single place to inspect the request-side story while preserving `response.json` for the response-side story.

## Rejected Alternatives

### 1. Only expand the object in `collect.ts`

Rejected because the CLI layer does not currently know the full effective request shape. The request-side state belongs closer to the request and pipeline layers.

### 2. Split into multiple new debug files

Rejected because the user explicitly wants `request.json` to carry as much information as possible. Multiple files would make the most relevant data harder to discover.

## File Changes

- Modify `packages/clipper-cli/src/core/request.ts`
  - define a richer request input/result shape that can carry request metadata in addition to response data
- Modify `packages/clipper-cli/src/core/fetcher.ts`
  - allow passing fetch/init-like options through and return the effective request snapshot for debugging
- Modify `packages/clipper-cli/src/types/context.ts`
  - expand request state to hold method, headers, body, fetch options, runtime snapshot, and pipeline metadata
- Modify `packages/clipper-cli/src/core/pipeline.ts`
  - persist request-side metadata into context and keep fallback/client metadata together
- Modify `packages/clipper-cli/src/cli/commands/collect.ts`
  - pass richer request options into the request runner and write the full request snapshot into `request.json`
- Modify tests in `tests/core/debug.test.ts` and `tests/cli/collect-debug.test.ts`
  - add assertions for the richer debug shape

## Testing Strategy

Use TDD:

1. Expand the collect debug test so it expects rich fields in `request.json`.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimal request metadata plumbing.
4. Re-run the focused tests until they pass.
5. Run the directly related debug test file to confirm artifact writing still works.

## Notes

- This change should store raw values exactly as available; no redaction is applied.
- Fields that are not known in a given execution path should be omitted or left undefined rather than invented.
- `response.json` should remain unchanged except for any shape naturally already produced by the request layer.
