export interface RequestSnapshot {
  url: string
  method: NonNullable<RequestInit['method']>
  headers?: Record<string, string>
  body?: string
  redirect?: RequestInit['redirect']
  referrer?: RequestInit['referrer']
  referrerPolicy?: RequestInit['referrerPolicy']
  mode?: RequestInit['mode']
  credentials?: RequestInit['credentials']
  cache?: RequestInit['cache']
  integrity?: RequestInit['integrity']
  timeout?: number
}

export interface ResponseSnapshot {
  url?: string
  status: number
  statusText?: string
  ok?: boolean
  redirected?: boolean
  headers: Record<string, string>
  body: string
}

export interface RequestResult extends ResponseSnapshot {
  request: RequestSnapshot
}

export interface RequestInput {
  url: string
  method?: RequestInit['method']
  headers?: Record<string, string>
  body?: string
  redirect?: RequestInit['redirect']
  referrer?: RequestInit['referrer']
  referrerPolicy?: RequestInit['referrerPolicy']
  mode?: RequestInit['mode']
  credentials?: RequestInit['credentials']
  cache?: RequestInit['cache']
  integrity?: RequestInit['integrity']
  timeout?: number
  fetcher: (input: RequestSnapshot) => Promise<RequestResult>
}

export async function performRequest(input: RequestInput): Promise<RequestResult> {
  const request: RequestSnapshot = {
    url: input.url,
    method: input.method ?? 'GET',
    headers: input.headers,
    body: input.body,
    redirect: input.redirect,
    referrer: input.referrer,
    referrerPolicy: input.referrerPolicy,
    mode: input.mode,
    credentials: input.credentials,
    cache: input.cache,
    integrity: input.integrity,
    timeout: input.timeout
  }

  const result = await input.fetcher(request)

  return {
    request: result.request,
    url: result.url,
    status: result.status,
    statusText: result.statusText,
    ok: result.ok,
    redirected: result.redirected,
    headers: result.headers,
    body: result.body
  }
}
