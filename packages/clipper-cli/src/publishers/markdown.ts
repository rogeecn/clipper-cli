import { createFilePublisher } from './file.js'

export const markdownPublisher = createFilePublisher({
  name: 'markdown',
  assetDirName: 'assets'
})
