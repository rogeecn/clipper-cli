# Publisher Deduplication Design

**Goal:** Remove duplicated file-publisher logic from the built-in Markdown and Obsidian publishers without changing their external behavior.

## Recommended Approach

Introduce a small internal factory that creates file-based publishers from two inputs:

- the publisher name
- the asset directory name

The shared factory owns the common behavior:

- resolve the output directory
- compute the Markdown entry file path
- compute the asset directory path
- create the output and asset directories
- write the Markdown file

`markdownPublisher` and `obsidianPublisher` remain exported concrete publishers. They only differ in the asset directory name:

- `markdown` uses `assets`
- `obsidian` uses `attachments`

## Why This Approach

This keeps the cleanup focused on actual duplication rather than changing public API shape.

Benefits:

- no behavior change for callers
- no changes to plugin registration or command wiring
- less repeated file-system code to maintain
- easy to extend if more file-based publishers are added later

## Error Handling

No new error handling is introduced in this pass.

The shared helper should preserve the current behavior exactly:

- use `process.cwd()` when `outputDir` is missing
- create directories recursively
- write `document.content.markdown` to the computed entry file

## Testing

Use TDD with a focused regression test:

- add a test that verifies the Markdown publisher still uses `assets`
- keep the existing Obsidian test that verifies `attachments`
- run the publisher tests after the refactor

## Non-Goals

This pass does not:

- remove `resolveCollector`
- change package exports
- alter runtime plugin behavior
- introduce a larger publisher abstraction beyond the minimal helper
