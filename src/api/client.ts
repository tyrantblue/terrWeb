export const API_BASE_URL = 'https://terraria-api.tyrantblue.xyz'
export const CLIENT_VERSION =
  import.meta.env.VITE_APP_VERSION ?? __APP_VERSION__
export const EXPECTED_API_VERSION = '2.2.1'

/**
 * `api_version` follows semver, and the backend only breaks compatibility
 * in a major release:
 *
 * - patch differences (2.0.1 → 2.0.2) are bug fixes — no action, no banner;
 * - minor differences mean new endpoints/fields may exist — soft notice
 *   (gated features come from `capabilities`);
 * - major differences may remove or change endpoints — hard notice;
 * - a client below `min_client_version` cannot work at all — hard notice.
 */
export type CompatibilityLevel =
  | 'ok'
  | 'outdated-server'
  | 'newer-server'
  | 'outdated-client'
  | 'incompatible'

/**
 * `/api/meta` is not runtime-validated, and the backend documents that
 * fields other than `capabilities` may be absent. Comparing versions
 * happens during render now, so a `null` must not reach `.split()`.
 */
function isVersionString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d/.test(value.trim())
  )
}

export function getCompatibilityLevel(
  clientVersion: string,
  apiVersion: string,
  minClientVersion: string,
  expectedApiVersion: string,
): CompatibilityLevel {
  // Without parseable strings there is nothing trustworthy to report;
  // staying quiet beats blanking the panel or inventing a mismatch.
  if (
    !isVersionString(apiVersion) ||
    !isVersionString(minClientVersion) ||
    !isVersionString(clientVersion) ||
    !isVersionString(expectedApiVersion)
  ) {
    return 'ok'
  }

  // The only hard requirement the backend states.
  if (compareVersions(clientVersion, minClientVersion) < 0) {
    return 'outdated-client'
  }

  if (
    getMajorVersion(apiVersion) !==
    getMajorVersion(expectedApiVersion)
  ) {
    return 'incompatible'
  }

  // Patch releases are not worth a banner.
  const expected = getMajorMinorVersion(expectedApiVersion)
  const actual = getMajorMinorVersion(apiVersion)

  if (expected === actual) {
    return 'ok'
  }

  return compareVersions(apiVersion, expectedApiVersion) < 0
    ? 'outdated-server'
    : 'newer-server'
}

function getMajorVersion(version: string) {
  return version.split('.')[0] ?? '0'
}

function getMajorMinorVersion(version: string) {
  const parts = version.split('.')

  return `${parseVersionPart(parts[0])}.${parseVersionPart(parts[1])}`
}

export interface ApiDeprecation {
  path: string
  replacement: string
  since: string
  sunset: string
}

export interface ApiMeta {
  api_version: string
  min_client_version: string
  /** Null until the API has managed to read the server version. */
  server_version: string | null
  capabilities: string[]
  /** Optional in the contract; items are free-form objects. */
  deprecations?: ApiDeprecation[]
  links?: {
    openapi?: string
    docs?: string
    changelog?: string
  }
}

/**
 * FastAPI answers request-validation failures with
 * `detail: ValidationError[]`, while business errors use the documented
 * `{ detail: string, error: { code, message, details } }` envelope.
 * Both shapes have to be understood or the panel renders
 * "[object Object]" for a 422.
 */
export interface ApiValidationError {
  type?: string
  loc?: Array<string | number>
  msg?: string
}

/** Some proxies return `detail: string[]` instead of objects. */
export type ApiValidationItem = ApiValidationError | string

export type ApiErrorDetail = string | ApiValidationItem[]

interface ApiErrorBody {
  detail?: ApiErrorDetail
  error?: {
    code?: string
    message?: string
    details?: Record<string, unknown>
  }
}

const LOCATION_PREFIXES = new Set(['body', 'query', 'path', 'header'])

function formatValidationErrors(
  errors: ApiValidationItem[],
) {
  return errors
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      const location = (item.loc ?? [])
        .filter(
          (part) =>
            !LOCATION_PREFIXES.has(String(part)),
        )
        .join('.')

      const message =
        item.msg ?? item.type ?? 'Invalid value'

      return location
        ? `${location}: ${message}`
        : message
    })
    .join('; ')
}

function formatErrorDetail(
  detail: ApiErrorDetail | undefined,
) {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const formatted = formatValidationErrors(detail)

    return formatted || undefined
  }

  return undefined
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Error bodies arrive as arbitrary parsed JSON (apiFetch and the XHR
 * upload path both feed this), so narrow defensively rather than
 * trusting the declared shape.
 */
function normalizeErrorBody(
  value: unknown,
): ApiErrorBody | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const body: ApiErrorBody = {}

  const { detail } = value

  if (
    typeof detail === 'string' ||
    Array.isArray(detail)
  ) {
    body.detail = detail as ApiErrorDetail
  }

  if (isRecord(value.error)) {
    const { code, message, details } = value.error

    body.error = {
      code:
        typeof code === 'string' ? code : undefined,
      message:
        typeof message === 'string'
          ? message
          : undefined,
      details: isRecord(details)
        ? details
        : undefined,
    }
  }

  return body
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: Record<string, unknown>

  constructor(
    status: number,
    body?: unknown,
  ) {
    const normalized = normalizeErrorBody(body)

    super(
      normalized?.error?.message ??
        formatErrorDetail(normalized?.detail) ??
        `API request failed: ${status}`,
    )

    this.name = 'ApiError'
    this.status = status
    this.code = normalized?.error?.code
    this.details = normalized?.error?.details
  }
}

/**
 * Every panel request is a small JSON call, so a request that never
 * settles is a bug rather than a slow success. Without a deadline a
 * single hung fetch would also stall the status poller, which drops
 * ticks while a request is outstanding.
 */
export const REQUEST_TIMEOUT_MS = 15000

function withTimeout(signal: AbortSignal | null | undefined) {
  if (typeof AbortSignal === 'undefined') {
    return signal ?? undefined
  }

  if (typeof AbortSignal.timeout !== 'function') {
    return signal ?? undefined
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  if (!signal) {
    return timeout
  }

  return typeof AbortSignal.any === 'function'
    ? AbortSignal.any([signal, timeout])
    : signal
}

/**
 * Codes the backend returns when it definitively did NOT execute the
 * command (the console FIFO was unwritable, or the control lock was not
 * acquired in time). Re-issuing the request therefore cannot run anything
 * twice. `console_timeout` is excluded on purpose: there the command *was*
 * written.
 */
const SAFE_RETRY_CODES = new Set([
  'console_unavailable',
  'console_busy',
])

const RETRY_BACKOFF_MS = [400, 1200]

export interface ApiFetchOptions extends RequestInit {
  /**
   * Set `false` for endpoints that persist something *before* they apply
   * it. `PUT /api/v1/config` writes `serverconfig.txt` first and applies
   * second, so a 503 from the apply step leaves the file already changed;
   * replaying the request then finds nothing to change and returns 200
   * without ever applying the value.
   */
  retry?: boolean
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { retry = true, ...init } = options

  for (
    let attempt = 0;
    ;
    attempt += 1
  ) {
    try {
      return await apiFetchOnce<T>(path, init)
    } catch (error) {
      const retryable =
        retry &&
        error instanceof ApiError &&
        error.code !== undefined &&
        SAFE_RETRY_CODES.has(error.code) &&
        attempt < RETRY_BACKOFF_MS.length

      if (!retryable) {
        throw error
      }

      await delay(RETRY_BACKOFF_MS[attempt])
    }
  }
}

async function apiFetchOnce<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers)

  headers.set(
    'X-Client-Version',
    CLIENT_VERSION,
  )

  let response: Response

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        signal: withTimeout(options?.signal),
      },
    )
  } catch (error) {
    // Only our own deadline is a timeout; a caller-initiated abort
    // must not be reported as one.
    if (
      error instanceof DOMException &&
      error.name === 'TimeoutError'
    ) {
      throw new Error(
        `Request to ${path} timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`,
        { cause: error },
      )
    }

    throw error
  }

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

export function getApiMeta() {
  return apiFetch<ApiMeta>('/api/meta')
}

function parseVersionPart(part: string | undefined) {
  const value = Number.parseInt(part ?? '', 10)

  return Number.isNaN(value) ? 0 : value
}

function compareVersions(
  left: string,
  right: string,
) {
  const leftParts = left.split('.')
  const rightParts = right.split('.')
  const length = Math.max(
    leftParts.length,
    rightParts.length,
  )

  for (let index = 0; index < length; index += 1) {
    const difference =
      parseVersionPart(leftParts[index]) -
      parseVersionPart(rightParts[index])

    if (difference !== 0) {
      return difference
    }
  }

  return 0
}
