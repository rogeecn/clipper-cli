export interface RequestResult {
  status: number
  headers: Record<string, string>
  body: string
}

export interface RequestInput {
  url: string
  fetcher: (url: string) => Promise<RequestResult>
}

export async function performRequest(input: RequestInput): Promise<RequestResult> {
  const result = await input.fetcher(input.url)

  return {
    status: result.status,
    headers: result.headers,
    body: result.body
  }
}
