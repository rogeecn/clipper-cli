# Weixin `/s` Path Support Design

**Goal:** Make the weixin collector recognize both `https://mp.weixin.qq.com/s?...` and `https://mp.weixin.qq.com/s/<id>` article URLs so debug collection and parsing consistently use the weixin pipeline.

**Scope:** Update only the weixin URL matching and related in-document article link extraction. Do not broaden matching to other `mp.weixin.qq.com` routes.

## Context

The current `weixinCollector.match()` requires `pathname === '/s'`. Real article links can also use the path form `/s/<id>`. When that happens, the CLI resolves the `generic` collector instead of `weixin`, so request headers are not applied and the HTML no longer matches the weixin parser assumptions.

## Options Considered

### 1. Support only `/s` and `/s/*` paths

- Match `hostname === 'mp.weixin.qq.com'`
- Accept `pathname === '/s' || pathname.startsWith('/s/')`
- Reuse the same rule when extracting related article links from the normalized HTML
- Pros: smallest change, directly fixes the reported URL, low risk of false positives
- Cons: other future article route variants would still need explicit support

### 2. Match broader `mp.weixin.qq.com` article-like routes

- Accept more paths and rely on parser/fallback later
- Pros: broader compatibility
- Cons: higher risk of selecting non-article pages and polluting collector choice

### 3. Detect article pages from fetched HTML instead of URL

- Start from looser URL matching and inspect article markers before selecting the collector
- Pros: most adaptive
- Cons: significantly more complexity than needed for this bug

## Chosen Approach

Use option 1.

## Design

### URL Matching

Introduce a tiny local helper in the weixin plugin that returns true only for:

- `url.hostname === 'mp.weixin.qq.com'`
- `url.pathname === '/s'` or `url.pathname.startsWith('/s/')`

Use this helper in `weixinCollector.match()`.

### Related Link Extraction

When normalizing article content, use the same helper while collecting in-document article links so `/s/<id>` links are retained just like `/s?...` links.

### Testing

Add a collector test covering the `/s/<id>` form.
Add a CLI integration test proving a `/s/<id>` URL selects the weixin collector and writes the weixin request headers into `request.json` in debug mode.

## Success Criteria

- `clipper collect https://mp.weixin.qq.com/s/<id> --debug` resolves the `weixin` collector
- `request.json` contains weixin request headers
- existing `/s?...` coverage remains green
