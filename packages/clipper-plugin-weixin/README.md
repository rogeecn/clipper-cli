# clipper-plugin-weixin

Publishable plugin package that provides a `weixin` collector and transformer for `clipper-cli`.

## What it does

- matches Weixin article URLs at `https://mp.weixin.qq.com/s`
- falls back when the response is not successful or the article body is missing
- extracts `#js_content`, Open Graph metadata, article links, and Markdown output

## Development

- `pnpm --filter clipper-plugin-weixin test`
- `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts`
- `pnpm --filter clipper-plugin-weixin test tests/package-metadata.test.ts`
- `pnpm --filter clipper-plugin-weixin build`

## Publish Verification

Before publishing, verify the package metadata and packed entrypoints stay honest:

- `pnpm --filter clipper-plugin-weixin build`
- `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts tests/package-metadata.test.ts`
- `pnpm --filter clipper-plugin-weixin pack --dry-run`
