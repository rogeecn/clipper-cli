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

## Local Link Workflow

When testing this plugin locally with `clipper-cli`, use the project-level link flow:

```bash
# In this package directory
npm link
pnpm --filter clipper-plugin-weixin build

# In the project where you run clipper
npm link clipper-plugin-weixin
clipper plugins --verbose
```

Important notes:

- Running only `npm link` in this plugin directory creates a global npm link, but does not make another project depend on the plugin yet.
- `clipper-cli` discovers plugins from the current project's dependency tree, so the consuming project must also run `npm link clipper-plugin-weixin`.
- This package exports `./dist/index.js`, so build it before checking `clipper plugins` or running `clipper collect`.

## Publish Verification

Before publishing, verify the package metadata and packed entrypoints stay honest:

- `pnpm --filter clipper-plugin-weixin build`
- `pnpm --filter clipper-plugin-weixin test tests/package-publish.test.ts tests/package-metadata.test.ts`
- `pnpm --filter clipper-plugin-weixin pack --dry-run`
