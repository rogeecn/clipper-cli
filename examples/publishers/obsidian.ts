export const obsidianExamplePublisher = {
  name: 'obsidian',
  resolveOutput(ctx: { input: { outputDir?: string }; document: { title: string } }) {
    const outputDir = ctx.input.outputDir ?? './vault'
    return {
      entryFile: `${outputDir}/${ctx.document.title}.md`,
      assetDir: `${outputDir}/attachments`
    }
  }
}
