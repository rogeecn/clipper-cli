import type { RequestResult, RequestSnapshot } from './request.js'

export async function fetchHtml(input: RequestSnapshot): Promise<RequestResult> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: input.headers,
    body: input.body,
    redirect: input.redirect,
    referrer: input.referrer,
    referrerPolicy: input.referrerPolicy,
    mode: input.mode,
    credentials: input.credentials,
    cache: input.cache,
    integrity: input.integrity
  })
  const body = await response.text()
  const headers: Record<string, string> = {}

  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    request: input,
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    redirected: response.redirected,
    headers,
    body
  }
}
