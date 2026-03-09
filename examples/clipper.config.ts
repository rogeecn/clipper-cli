export default {
  defaultCollector: 'generic',
  plugins: ['wechat'],
  publishers: ['markdown', 'obsidian'],
  runtime: {
    debug: false,
    outputDir: './notes'
  }
}
