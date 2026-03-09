# Clipper CLI Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a publishable NPM CLI that collects webpage content through pluggable collectors and transformers, falls back from request to plugin-defined CDP when needed, and publishes Markdown files to local directories such as Obsidian vaults.

**Architecture:** The CLI owns configuration loading, plugin registration, orchestration, and error reporting. The runtime is built around `collector / transformer / publisher` modules with lifecycle hooks and a shared context object. Request is the default acquisition path; a collector may trigger a client fallback and provide its own CDP settings.

**Tech Stack:** Node.js, TypeScript, npm, Vitest, Commander, Playwright, JSDOM, Turndown

---

### Task 1: Bootstrap package and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli/index.ts`
- Create: `src/index.ts`
- Test: `package.json`

**Step 1: Write the failing bootstrap test**

```ts
import { describe, expect, it } from 'vitest'
import pkg from '../package.json'

describe('package bootstrap', () => {
  it('exposes a bin entry for the cli', () => {
    expect(pkg.bin).toHaveProperty('clipper')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand`
Expected: FAIL with missing package metadata or missing test setup

**Step 3: Write minimal implementation**

```json
{
  "name": "clipper-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "clipper": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

```ts
#!/usr/bin/env node
export {}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand`
Expected: PASS for package bootstrap test

**Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/cli/index.ts src/index.ts
git commit -m "feat: bootstrap publishable cli package"
```

### Task 2: Define core types and shared context

**Files:**
- Create: `src/types/document.ts`
- Create: `src/types/context.ts`
- Create: `src/types/plugin.ts`
- Create: `tests/types/plugin.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import type { ClipperDocument } from '../../src/types/document'

describe('document shape', () => {
  it('requires markdown and html content fields', () => {
    const document: ClipperDocument = {
      url: 'https://example.com',
      title: 'Example',
      content: {
        html: '<p>Hello</p>',
        markdown: 'Hello'
      },
      assets: [],
      meta: {},
      source: 'test',
      tags: []
    }

    expect(document.content.markdown).toBe('Hello')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/types/plugin.test.ts`
Expected: FAIL with missing type module

**Step 3: Write minimal implementation**

```ts
export interface ClipperDocument {
  url: string
  title: string
  excerpt?: string
  author?: string
  publishedAt?: string
  content: {
    html: string
    markdown: string
  }
  assets: Array<{ url: string; filename?: string; mimeType?: string }>
  meta: Record<string, unknown>
  source: string
  tags: string[]
  diagnostics?: Record<string, unknown>
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/types/plugin.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/document.ts src/types/context.ts src/types/plugin.ts tests/types/plugin.test.ts
git commit -m "feat: define core plugin contracts"
```

### Task 3: Implement configuration loading and plugin registration

**Files:**
- Create: `src/core/config.ts`
- Create: `src/core/registry.ts`
- Create: `tests/core/config.test.ts`
- Modify: `src/types/plugin.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createRegistry } from '../../src/core/registry'

describe('plugin registry', () => {
  it('finds the first collector matching a url', () => {
    const registry = createRegistry({
      collectors: [
        { name: 'example', match: url => url.hostname === 'example.com' }
      ],
      transformers: [],
      publishers: []
    })

    expect(registry.resolveCollector('https://example.com/post')).toBe('example')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/config.test.ts`
Expected: FAIL with missing registry implementation

**Step 3: Write minimal implementation**

```ts
export function createRegistry(config: RuntimeConfig) {
  return {
    resolveCollector(input: string) {
      const url = new URL(input)
      const match = config.collectors.find(plugin => plugin.match(url))
      return match?.name
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/config.ts src/core/registry.ts src/types/plugin.ts tests/core/config.test.ts
git commit -m "feat: add config loading and plugin registry"
```