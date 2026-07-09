// Shared fetch helper with typed errors so category pages can render graceful
// "API down / rate-limited / missing key" states.

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code // 'missing_key' | 'rate_limited' | 'http' | 'network'
  }
}

export async function fetchJson(url, { signal } = {}) {
  let res
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Network error — check your connection.', {
      code: 'network',
    })
  }

  if (res.status === 429) {
    throw new ApiError('Rate limited — please wait a moment and retry.', {
      status: 429,
      code: 'rate_limited',
    })
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status}).`, {
      status: res.status,
      code: 'http',
    })
  }
  return res.json()
}

export function requireKey(key, source) {
  if (!key) {
    throw new ApiError(
      `Missing API key for ${source}. Add it to your .env file to enable this category.`,
      { code: 'missing_key' },
    )
  }
}
