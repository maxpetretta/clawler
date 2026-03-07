export type JsonRequest = {
  url: string
  method?: "GET" | "POST"
  headers?: Record<string, string>
  body?: unknown
  provider: string
  timeoutSeconds: number
}

export async function fetchJson<TResponse>(request: JsonRequest, fetchImpl: typeof fetch = fetch): Promise<TResponse> {
  const response = await fetchImpl(request.url, {
    method: request.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...request.headers,
    },
    body: request.body ? JSON.stringify(request.body) : undefined,
    signal: AbortSignal.timeout(request.timeoutSeconds * 1000),
  })

  const text = await response.text()
  const payload = text.length > 0 ? safeJsonParse(text) : undefined

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? `${request.provider} request failed (${response.status}): ${JSON.stringify(payload.error)}`
        : `${request.provider} request failed (${response.status}): ${text || response.statusText}`

    throw new Error(message)
  }

  return payload as TResponse
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
