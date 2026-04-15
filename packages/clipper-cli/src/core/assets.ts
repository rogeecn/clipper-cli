import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { ProxyAgent } from 'undici'
import type { ClipperAsset } from '../types/document.js'

interface DownloadAssetsOptions {
  assets: ClipperAsset[]
  outputDir: string
  proxy?: string
}

function resolveAssetFilename(asset: ClipperAsset, index: number): string {
  if (asset.filename) {
    return asset.filename
  }

  try {
    const url = new URL(asset.url)
    const derivedName = basename(url.pathname)

    if (derivedName) {
      return derivedName
    }
  } catch {
    // fall back to a synthetic filename below
  }

  return `asset-${index + 1}`
}

export async function downloadAssets(options: DownloadAssetsOptions): Promise<void> {
  if (options.assets.length === 0) {
    return
  }

  await mkdir(options.outputDir, { recursive: true })
  const dispatcher = options.proxy ? new ProxyAgent(options.proxy) : undefined

  await Promise.all(
    options.assets.map(async (asset, index) => {
      try {
        const response = await fetch(asset.url, {
          dispatcher
        } as RequestInit & { dispatcher?: ProxyAgent })

        if (!response.ok) {
          throw new Error(`asset request failed with status ${response.status}`)
        }

        const filePath = join(options.outputDir, resolveAssetFilename(asset, index))
        const buffer = new Uint8Array(await response.arrayBuffer())
        await writeFile(filePath, buffer)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown asset download failure'
        console.warn(`Failed to download asset ${asset.url}: ${message}`)
      }
    })
  )
}
