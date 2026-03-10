# Debug Document Artifacts Design

**Goal:** Make `--debug` write a richer `document.json` that preserves the normalized document while also exposing concise debug metadata at both the top level and under `diagnostics`.

**Scope:** Expand document-side debug artifact generation in `packages/clipper-cli` so `document.json` includes runtime, pipeline, fallback, and request/response summary metadata. Do not duplicate the full `request.json` or `response.json` payloads.

## Problem

`document.json` currently serializes the normalized `ClipperDocument` as-is. That preserves the content result, but it does not explain how the document was produced: which collector and transformer ran, whether fallback happened, or which request/response characteristics influenced normalization.

## Chosen Approach

Keep the document body unchanged, but enrich the debug artifact with two complementary metadata views:

- top-level debug fields for fast inspection
- a parallel `diagnostics.debug` object aligned with the document type’s existing diagnostics channel

The metadata will include:

- `runtime` such as `cwd` and `debug`
- `pipeline` such as `collector`, `transformer`, and `publisher`
- `clientFallback` such as whether fallback ran and which client options were used
- `requestSummary` such as `url`, `method`, `headerKeys`, and `timeout`
- `responseSummary` such as `url`, `status`, `statusText`, `ok`, `redirected`, `headerKeys`, and `rawHtmlSource`

This gives a quick top-level view while also keeping a structured copy in `diagnostics.debug` for downstream tooling.

## Rejected Alternatives

### 1. Put all metadata only in `diagnostics`

Rejected because the user wants direct visibility in `document.json` without drilling into nested diagnostics.

### 2. Copy full request and response artifacts into `document.json`

Rejected because it would duplicate large payloads, especially full HTML bodies and full header maps, making `document.json` noisy and oversized.

## File Changes

- Modify `packages/clipper-cli/src/types/document.ts`
  - extend the debug artifact shape if needed so top-level metadata fields are representable
- Modify `packages/clipper-cli/src/cli/commands/collect.ts`
  - build a debug-oriented document snapshot instead of writing the raw normalized document directly
- Modify tests in `tests/cli/collect-debug.test.ts` and `tests/core/debug.test.ts`
  - assert the new top-level fields and `diagnostics.debug` structure

## Testing Strategy

Use TDD:

1. Expand the collect debug test so it expects top-level document debug fields and `diagnostics.debug`.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimal summary-building logic.
4. Re-run the focused tests until they pass.
5. Re-run the related debug tests and build.

## Notes

- Keep the original document fields unchanged.
- Summaries should include only concise, high-signal fields.
- Prefer deriving summaries from the already-built request and response context to avoid parallel data models.
