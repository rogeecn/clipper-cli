import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ClipperDocument } from '../types/document.js'
import type { PublisherPlugin } from '../types/plugin.js'

export const obsidianPublisher: PublisherPlugin = {
  name: 'obsidian',
  resolveOutput(ctx: { input: { outputDir?: string }; document: ClipperDocument }) {
    const outputDir = ctx.input.outputDir ?? process.cwd()
    return {
      entryFile: join(outputDir, `${ctx.document.title}.md`),
      assetDir: join(outputDir, 'attachments')
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
