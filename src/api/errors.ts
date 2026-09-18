import { ApiError } from './client'

/**
 * The backend exposes a stable `error.code` on every failure
 * (`docs/api/v1.md`), so user-facing copy is keyed off the code rather
 * than the HTTP status or the (Chinese, implementation-flavoured)
 * backend message.
 */
interface ErrorCopy {
  summary: string
  hint?: string
  /**
   * True only when the backend has guaranteed the action did NOT run, so
   * re-issuing it cannot double-execute. `console_timeout` is
   * deliberately absent: the command *was* written, it just produced no
   * echo.
   */
}

const ERROR_COPY: Record<string, ErrorCopy> = {
  bad_request: {
    summary: 'The server rejected the request as invalid.',
  },
  validation_failed: {
    summary: 'The server rejected the submitted values.',
  },
  not_found: {
    summary: 'That resource no longer exists on the server.',
  },
  conflict: {
    summary: 'The request conflicts with the current server state.',
  },
  forbidden: {
    summary: 'The console allowlist blocked that command.',
    hint: 'Shut the server down with the Restart action, not the exit command.',
  },
  upstream_failed: {
    summary: 'The game server returned an unexpected result.',
  },
  console_unavailable: {
    summary: 'The server console is unavailable — it is probably restarting.',
    hint: 'Try again in a few seconds.',
  },
  console_busy: {
    summary: 'The console is busy running another command.',
    hint: 'Try again in a few seconds.',
  },
  console_timeout: {
    summary: 'The command was sent but the server never echoed it.',
    hint: 'The log pipeline may be stalled, so the panel cannot read server state. Check the Console heartbeat.',
  },
  guard_unavailable: {
    summary: 'The connection guard is not running.',
    hint: 'Start the guard sidecar, then reload the guard state.',
  },
  internal_error: {
    summary: 'The API hit an internal error.',
  },
  // The four codes API 2.1.0 introduces. The panel can meet all of them, and
  // without copy they would surface as the backend's bare message.
  client_outdated: {
    summary: 'This panel build is older than the API allows.',
    hint: 'Refresh the page to load the current build; a cached copy is still running.',
  },
  unauthorized: {
    summary: 'The API requires a token for this action.',
    hint: 'The backend is running with TERRARIA_API_TOKEN set. This panel build has no way to send one, so write actions will keep failing until the token is removed or the panel is put behind a proxy that adds it.',
  },
  too_many_requests: {
    summary: 'The API is rate limiting this panel.',
    hint: 'Wait a moment before retrying; the response says how long in Retry-After.',
  },
  operation_not_found: {
    summary: 'That operation is no longer tracked by the API.',
    hint: 'Operations live in API memory, so a restart erases them. Check the current server state before retrying.',
  },
}

const STATUS_FALLBACK: Record<number, ErrorCopy> = {
  401: {
    summary: 'The API requires a token for this action.',
    hint: 'The backend is running with TERRARIA_API_TOKEN set, and this panel cannot send one.',
  },
  426: {
    summary: 'This panel build is older than the API allows.',
    hint: 'Refresh the page to load the current build.',
  },
  429: {
    summary: 'The API is rate limiting this panel.',
    hint: 'Wait a moment before retrying.',
  },
  502: { summary: 'The API could not reach the game server.' },
  503: {
    summary: 'The API is temporarily unavailable.',
    hint: 'It is probably restarting. Try again in a few seconds.',
  },
}

interface ErrorInfo {
  /** Message keyed off the stable error code. */
  summary: string
  /** The backend's own message, when it adds specifics. */
  detail?: string
  hint?: string
}

function describeError(error: unknown): ErrorInfo {
  if (error instanceof ApiError) {
    // The backend rejects a replayed mask with this sentinel; a generic
    // "bad request" would not tell the user what to do about it.
    if (
      error.status === 400 &&
      error.details?.key === 'password'
    ) {
      return {
        summary:
          'The masked password cannot be sent back as a new password.',
        hint: 'Leave the field empty to keep the current password, or type a new one.',
      }
    }

    const byCode = error.code
      ? ERROR_COPY[error.code]
      : undefined
    const byStatus = STATUS_FALLBACK[error.status]
    const copy = byCode ?? byStatus

    // Skip the backend detail when it would just repeat the summary.
    const detail =
      error.message && error.message !== copy?.summary
        ? error.message
        : undefined

    return {
      summary:
        copy?.summary ??
        error.message ??
        `Request failed (${error.status}).`,
      detail,
      hint: copy?.hint,
    }
  }

  if (error instanceof Error) {
    return { summary: error.message }
  }

  return { summary: 'Something went wrong.' }
}

/**
 * Banner-ready rendering: the coded summary, the backend's own message,
 * any structured `details`, then the actionable hint. De-duplicated so a
 * backend message that merely repeats the summary is not shown twice.
 */
export function formatErrorReport(error: unknown) {
  const info = describeError(error)
  const details = formatErrorDetails(error)

  const parts = [
    info.summary,
    info.detail,
    details,
    info.hint,
  ].filter((part): part is string => Boolean(part))

  return Array.from(new Set(parts)).join(' ')
}

/**
 * Renders `error.details` as `key=value` pairs instead of letting the
 * object print as "[object Object]".
 *
 * Validation errors are deliberately NOT rendered here: `ApiError`
 * already folds FastAPI's `detail[]` into its `message` with the location
 * prefixes stripped, so re-rendering them would duplicate the text (and
 * leak a stray "body." prefix).
 */
function formatErrorDetails(
  error: unknown,
): string | undefined {
  if (!(error instanceof ApiError)) {
    return undefined
  }

  const parts: string[] = []

  const details = error.details

  if (details) {
    const rendered = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const text = Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)

        return `${key}=${text}`
      })

    if (rendered.length) {
      parts.push(rendered.join(', '))
    }
  }

  return parts.length ? parts.join(' — ') : undefined
}

function firstNumber(
  details: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = details[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string') {
      const parsed = Number(value)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * Upload failures have their own vocabulary: the useful information is in
 * `error.details` (the size limit, or the free space) rather than in a
 * generic code. The XHR upload path rejects with the same `ApiError`, so
 * this reads exactly the fields `apiFetch` would have produced.
 */
export function describeUploadError(error: unknown) {
  if (error instanceof ApiError) {
    const details = error.details ?? {}

    if (error.status === 409) {
      const name = details.file ?? details.name

      return typeof name === 'string' && name
        ? `A world file named "${name}" already exists. Rename the upload or delete the existing world first.`
        : 'A world with that file name already exists. Rename the upload or delete the existing world first.'
    }

    if (error.status === 413) {
      const limit = firstNumber(details, [
        'max_bytes',
        'limit_bytes',
        'max_size',
        'limit',
      ])

      return limit === null
        ? 'The world file is larger than the server allows.'
        : `The world file is larger than the server's ${formatBytes(limit)} limit.`
    }

    if (error.status === 507) {
      const free = firstNumber(details, [
        'available_bytes',
        'free_bytes',
        'available',
        'free',
      ])

      return free === null
        ? 'The server does not have enough disk space for this world.'
        : `The server does not have enough disk space (${formatBytes(free)} free).`
    }
  }

  return formatErrorReport(error)
}
