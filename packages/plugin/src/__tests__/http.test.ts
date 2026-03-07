import { describe, expect, test } from "bun:test"
import { fetchJson } from "../http"

describe("fetchJson", () => {
  test("sends JSON requests and parses JSON responses", async () => {
    let init: RequestInit | undefined
    const result = await fetchJson<{ ok: boolean }>(
      {
        provider: "test",
        url: "https://example.com/search",
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: {
          query: "openclaw",
        },
        timeoutSeconds: 3,
      },
      (_url, requestInit) => {
        init = requestInit
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      },
    )

    expect(result).toEqual({ ok: true })
    expect(init?.method).toBe("POST")
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      "content-type": "application/json",
    })
    expect(init?.body).toBe(JSON.stringify({ query: "openclaw" }))
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  test("returns plain text when response is not JSON", async () => {
    const result = await fetchJson<string>(
      {
        provider: "test",
        url: "https://example.com/plain",
        timeoutSeconds: 1,
      },
      async () => new Response("plain text", { status: 200 }),
    )

    expect(result).toBe("plain text")
  })

  test("includes structured provider errors in thrown messages", async () => {
    await expect(
      fetchJson(
        {
          provider: "exa",
          url: "https://example.com/fail",
          timeoutSeconds: 1,
        },
        async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 }),
      ),
    ).rejects.toThrow('exa request failed (401): {"message":"bad key"}')
  })

  test("includes response text when error payload is not structured JSON", async () => {
    await expect(
      fetchJson(
        {
          provider: "exa",
          url: "https://example.com/fail",
          timeoutSeconds: 1,
        },
        async () => new Response("service unavailable", { status: 503, statusText: "Service Unavailable" }),
      ),
    ).rejects.toThrow("exa request failed (503): service unavailable")
  })
})
