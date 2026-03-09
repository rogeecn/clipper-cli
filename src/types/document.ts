export interface ClipperAsset {
  url: string
  filename?: string
  mimeType?: string
}

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
  assets: ClipperAsset[]
  meta: Record<string, unknown>
  source: string
  tags: string[]
  diagnostics?: Record<string, unknown>
}
