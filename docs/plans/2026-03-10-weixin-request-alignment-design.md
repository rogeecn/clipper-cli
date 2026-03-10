# Weixin Request Alignment Design

**Goal:** Make `packages/clipper-plugin-weixin/` send Weixin article requests with the same browser-like headers and timeout behavior as `demo.fetch.js`, so the host request more closely matches the proven anti-bot-safe shape.

**Scope:** Only align request construction for the Weixin collector. Do not change HTML parsing, fallback detection, or markdown transformation.

## Problem

The current Weixin plugin only exposes `match` and `shouldFallback` in `packages/clipper-plugin-weixin/src/index.ts`. It does not provide request-specific client options, so the host fetch layer uses its own defaults. That differs from `demo.fetch.js`, which sends a fuller browser header set plus a `30000` ms timeout. This mismatch is the likely reason Weixin can detect the CLI request as non-browser traffic.

## Chosen Approach

Add `buildClientOptions` to `weixinCollector` and have it return:

- a `headers` object copied 1:1 from `demo.fetch.js` `BROWSER_HEADERS`
- a dynamic `Referer` equal to the current article URL
- `timeout: 30000`

This keeps the fix local to the Weixin plugin, matches the proven reference behavior, and avoids changing request defaults for unrelated collectors.

## Rejected Alternatives

### 1. Only add a few common headers

Rejected because it is not what was requested and leaves room for anti-bot heuristics to still see a mismatch.

### 2. Change the core host request client defaults

Rejected because it would affect every collector and expand scope beyond the Weixin anti-bot issue.

## File Changes

- Modify `packages/clipper-plugin-weixin/src/index.ts`
  - add browser header constants copied from `demo.fetch.js`
  - add `buildClientOptions` on `weixinCollector`
- Modify `packages/clipper-plugin-weixin/tests/weixin.test.ts`
  - replace the old assertion that `buildClientOptions` is undefined
  - add assertions for the exact header values, dynamic `Referer`, and `timeout`

## Testing Strategy

Use TDD:

1. Add a failing test that expects `weixinCollector.buildClientOptions` to exist.
2. Assert that it returns the browser header set from `demo.fetch.js`.
3. Assert that `Referer` equals the input URL.
4. Assert that `timeout` equals `30000`.
5. Run the package test suite after implementation.

## Notes

- This design intentionally keeps the `Cookie` header aligned with `demo.fetch.js` because the requirement is to mirror request parameters 1:1 for anti-bot avoidance.
- HTTP to HTTPS normalization already happens in `demo.fetch.js` request code, but the plugin receives URL input from the host. This design does not attempt to rewrite the host request URL because the approved scope is headers plus timeout only.
