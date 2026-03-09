# Publisher Deduplication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove duplicated built-in publisher logic while preserving current Markdown and Obsidian output behavior.

**Architecture:** Extract the shared file-based publisher behavior into a small internal helper that accepts a publisher name and asset directory name. Keep `markdownPublisher` and `obsidianPublisher` as concrete exports so callers and runtime configuration remain unchanged.

**Tech Stack:** TypeScript, Node.js, Vitest

---

### Task 1: Lock in asset-directory behavior with a failing test

**Files:**
- Modify: `tests/publishers/markdown.test.ts`
- Test: `tests/publishers/markdown.test.ts`

**Step 1: Write the failing test**

Add a second assertion that verifies the Markdown publisher still stores assets under `assets`:

```ts
it('stores assets under an assets directory', () => {
  const output = markdownPublisher.resolveOutput({
    input: { outputDir: '/vault', url: 'https://example.com' },
    document: {
      url: 'https://example.com',
      title: 'Hello World',
      content: { html: '<p>Hello</p>', markdown: 'Hello' },
      assets: [],
      meta: {},
      source: 'test',
      tags: []
    }
  } as never)

  expect(output.assetDir).toBe('/vault/assets')
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/publishers/markdown.test.ts`
Expected: FAIL if the refactor accidentally changes the asset directory behavior

**Step 3: Write minimal implementation**

No production change in this task. This task exists to strengthen regression coverage before the refactor.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/publishers/markdown.test.ts`
Expected: PASS

### Task 2: Extract the shared file publisher helper

**Files:**
- Modify: `src/publishers/markdown.ts`
- Modify: `src/publishers/obsidian.ts`
- Create: `src/publishers/file.ts`
- Test: `tests/publishers/markdown.test.ts`
- Test: `tests/publishers/obsidian.test.ts`

**Step 1: Write the failing test**

Use the tests from Task 1 plus the existing Obsidian test as the protection for the refactor.

**Step 2: Run tests to verify the current baseline**

Run: `npm test -- tests/publishers/markdown.test.ts tests/publishers/obsidian.test.ts`
Expected: PASS before refactor

**Step 3: Write minimal implementation**

Create `src/publishers/file.ts` with a helper like:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ClipperDocument } from '../types/document.js'
import type { PublisherOutput, PublisherPlugin } from '../types/plugin.js'

interface FilePublisherOptions {
  name: string
  assetDirName: string
}

export function createFilePublisher(options: FilePublisherOptions): PublisherPlugin {
  return {
    name: options.name,
    resolveOutput(ctx: { input: { outputDir?: string }; document: ClipperDocument }): PublisherOutput {
      const outputDir = ctx.input.outputDir ?? process.cwd()
      return {
        entryFile: join(outputDir, `${ctx.document.title}.md`),
        assetDir: join(outputDir, options.assetDirName)
      }
    },
    async publish(ctx) {
      const output = this.resolveOutput(ctx)
      await mkdir(ctx.input.outputDir ?? process.cwd(), { recursive: true })
      await mkdir(output.assetDir, { recursive: true })
      await writeFile(output.entryFile, ctx.document.content.markdown, 'utf8')
      return output
    }
  }
}
```

Then replace the duplicated publisher objects with:

```ts
export const markdownPublisher = createFilePublisher({
  name: 'markdown',
  assetDirName: 'assets'
})
```

and

```ts
export const obsidianPublisher = createFilePublisher({
  name: 'obsidian',
  assetDirName: 'attachments'
})
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- tests/publishers/markdown.test.ts tests/publishers/obsidian.test.ts`
Expected: PASS

### Task 3: Run focused regression verification

**Files:**
- Test: `tests/publishers/markdown.test.ts`
- Test: `tests/publishers/obsidian.test.ts`

**Step 1: Run focused verification**

Run: `npm test -- tests/publishers/markdown.test.ts tests/publishers/obsidian.test.ts`
Expected: PASS with no behavior changes

**Step 2: Summarize result**

Report that the duplication was removed and that both publisher behaviors remain intact.
