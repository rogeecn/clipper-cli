import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface DebugArtifacts {
  cwd: string
  request?: unknown
  response?: unknown
  rawHtml?: string
  cleanedHtml?: string
  document?: unknown
  screenshot?: Buffer
}

export function createDebugArtifacts(): Omit<DebugArtifacts, 'cwd'> {
  return {}
}

export async function writeDebugArtifacts(artifacts: DebugArtifacts): Promise<string> {
  const outputDir = join(artifacts.cwd, '.clipper', 'debug', String(Date.now()))
  await mkdir(outputDir, { recursive: true })

  if (artifacts.request) {
    await writeFile(join(outputDir, 'request.json'), JSON.stringify(artifacts.request, null, 2), 'utf8')
  }

  if (artifacts.response) {
    await writeFile(join(outputDir, 'response.json'), JSON.stringify(artifacts.response, null, 2), 'utf8')
  }

  if (artifacts.rawHtml !== undefined) {
    await writeFile(join(outputDir, 'raw.html'), artifacts.rawHtml, 'utf8')
  }

  if (artifacts.cleanedHtml !== undefined) {
    await writeFile(join(outputDir, 'cleaned.html'), artifacts.cleanedHtml, 'utf8')
  }

  if (artifacts.document) {
    await writeFile(join(outputDir, 'document.json'), JSON.stringify(artifacts.document, null, 2), 'utf8')
  }

  if (artifacts.screenshot) {
    await writeFile(join(outputDir, 'screenshot.png'), artifacts.screenshot)
  }

  return outputDir
}
