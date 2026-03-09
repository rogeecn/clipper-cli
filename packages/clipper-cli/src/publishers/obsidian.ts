import { createFilePublisher } from './file.js'

export const obsidianPublisher = createFilePublisher({
  name: 'obsidian',
  assetDirName: 'attachments'
})
