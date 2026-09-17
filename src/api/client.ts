export const API_BASE_URL = 'https://terraria-api.tyrantblue.xyz'
export const CLIENT_VERSION =
  import.meta.env.VITE_APP_VERSION ?? '1.0.0'

interface ApiErrorBody {
  detail?: string
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: Record<string, unknown>

  constructor(
    status: number,
    body?: ApiErrorBody,
  ) {
    super(
      body?.error?.message ??
        body?.detail ??
        `API request failed: ${status}`,
    )

    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code
    this.details = body?.error?.details
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers)

  headers.set(
    'X-Client-Version',
    CLIENT_VERSION,
  )

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers,
    },
  )

  if (!response.ok) {
    let body: ApiErrorBody | undefined

    try {
      body = await response.json()
    } catch {
      body = undefined
    }

    throw new ApiError(response.status, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
