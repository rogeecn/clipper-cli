export async function fetchHtml(url: string): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  const response = await fetch(url)
  const body = await response.text()
  const headers: Record<string, string> = {}

  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    status: response.status,
    headers,
    body
  }
}
