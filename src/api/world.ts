import {
  API_BASE_URL,
  ApiError,
  CLIENT_VERSION,
  apiFetch,
} from './client'

/**
 * Official Terraria world tiers. `small`/`medium`/`large` are the three
 * shipped dimensions; the backend classifies non-official sizes by width,
 * so this field never carries an unknown value.
 */
export type WorldSizeTier =
  | 'small'
  | 'medium'
  | 'large'

/**
 * The difficulties the backend knows about. The field itself can still
 * carry an unknown value (`unknown(7)`) when a newer Terraria version adds
 * a mode, so read it as a string and map the known ones for display.
 */
export type WorldDifficulty =
  | 'classic'
  | 'expert'
  | 'master'
  | 'journey'

/**
 * The `.wld` header the API parses (API 2.0.0+, capability
 * `world.metadata`). The whole object is `null` for old (pre-1.3.5.3),
 * damaged or truncated files — the list endpoint still answers 200, and
 * the panel renders those as "unknown".
 */
export interface WorldMetadata {
  format_version: number
  size_tier: WorldSizeTier
  width: number
  height: number
  difficulty: WorldDifficulty | (string & {})
  /** ISO-8601 UTC, or `null` when the header has no creation time. */
  created_at: string | null
}

export interface World {
  name: string
  file: string
  size: number
  modified_at: number
  active: boolean
  /**
   * Absent on API 1.x, `null` for unreadable files. Read it defensively
   * (`world.metadata?.`) even when the capability is advertised.
   */
  metadata?: WorldMetadata | null
}

export interface WorldListResponse {
  worlds: World[]
  active_world: string | null
  backup_dir: string
}

export function getWorlds() {
  return apiFetch<WorldListResponse>(
    '/api/v1/worlds',
  )
}

export interface OperationStart {
  operation_id: string
  state: OperationState
  kind: string
  /** Polling URL supplied by the backend (202 responses). */
  poll?: string
}

export type OperationState =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'

/**
 * Mirrors the backend `OperationView`. `progress` and `message` are
 * always present; the timestamps are epoch seconds, and `result` holds
 * the operation-specific payload (for example `{ restarted: true }`).
 */
export interface Operation {
  id: string
  kind: string
  state: OperationState
  progress: number
  message: string
  created_at: number
  started_at: number | null
  finished_at: number | null
  result: Record<string, unknown> | null
  error: string | null
}

export interface OperationList {
  operations: Operation[]
}

/**
 * The backend keeps operation state in API-process memory, so an API
 * restart erases it. The documented contract is that the panel treats
 * the resulting 404 as "finished, outcome unknown".
 *
 * Only a 404 that actually names a missing operation qualifies: an older
 * API without the route (or a malformed id) returns a bare "Not Found",
 * and reporting those as an API restart would misdirect diagnosis.
 */
function isMissingOperation(error: ApiError) {
  if (error.status !== 404) {
    return false
  }

  return (
    error.code === 'not_found' ||
    /operation/i.test(error.message)
  )
}

export class OperationLostError extends Error {
  constructor(id: string) {
    super(
      `Operation ${id} has ended, but its result is unknown because the API restarted. Refresh to confirm the current server state before retrying.`,
    )

    this.name = 'OperationLostError'
  }
}

export function switchWorld(file: string) {
  return apiFetch<OperationStart>(
    `/api/v1/worlds/${encodeURIComponent(file)}/activate`,
    {
      method: 'POST',
    },
  )
}

export function backupWorld(file: string) {
  return apiFetch<OperationStart>(
    `/api/v1/worlds/${encodeURIComponent(file)}/backup`,
    { method: 'POST' },
  )
}

export function deleteWorld(file: string) {
  return apiFetch<void>(
    `/api/v1/worlds/${encodeURIComponent(file)}`,
    { method: 'DELETE' },
  )
}

export function getOperation(id: string) {
  return apiFetch<Operation>(
    `/api/v1/operations/${encodeURIComponent(id)}`,
  )
}

/** Most recent operations first (backend keeps the last 50). */
export function getOperations() {
  return apiFetch<OperationList>('/api/v1/operations')
}

// A restore restarts the server twice, so the wait budget has to be more
// generous than a single restart's 60s backend timeout.
const FAST_POLL_INTERVAL_MS = 500
const SLOW_POLL_INTERVAL_MS = 1200
const FAST_POLL_WINDOW_MS = 5000
const MAX_POLL_ATTEMPTS = 400

/** Raised when the caller aborts the wait (e.g. the page unmounted). */
export class OperationCancelledError extends Error {
  constructor() {
    super('Operation wait was cancelled.')
    this.name = 'OperationCancelledError'
  }
}

export interface WaitForOperationOptions {
  onProgress?: (operation: Operation) => void
  /** Abort the polling loop, for example when the component unmounts. */
  signal?: AbortSignal
}

export async function waitForOperation(
  id: string,
  options: WaitForOperationOptions = {},
) {
  const startedAt = Date.now()

  for (
    let attempt = 0;
    attempt < MAX_POLL_ATTEMPTS;
    attempt += 1
  ) {
    if (options.signal?.aborted) {
      throw new OperationCancelledError()
    }

    let operation: Operation

    try {
      operation = await getOperation(id)
    } catch (error) {
      if (
        error instanceof ApiError &&
        isMissingOperation(error)
      ) {
        throw new OperationLostError(id)
      }

      throw error
    }

    options.onProgress?.(operation)

    if (operation.state === 'succeeded') {
      return operation
    }

    if (operation.state === 'failed') {
      throw new Error(
        operation.error ??
          operation.message ??
          'Operation failed',
      )
    }

    // Poll fast while the operation is warming up, then back off so a long
    // restore does not hammer the API.
    const elapsed = Date.now() - startedAt
    const interval = elapsed < FAST_POLL_WINDOW_MS
      ? FAST_POLL_INTERVAL_MS
      : SLOW_POLL_INTERVAL_MS

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        options.signal?.removeEventListener('abort', handleAbort)
        resolve()
      }, interval)

      function handleAbort() {
        window.clearTimeout(timer)
        reject(new OperationCancelledError())
      }

      options.signal?.addEventListener('abort', handleAbort, {
        once: true,
      })
    })
  }

  throw new Error(
    `Operation ${id} did not finish within ${Math.round((MAX_POLL_ATTEMPTS * SLOW_POLL_INTERVAL_MS) / 1000)}s. It may still be running — refresh to check.`,
  )
}

export interface OperationConflict {
  operationId: string
  kind: string | null
}

/**
 * Restart-class operations (`server.restart`, `world.activate`,
 * `config.apply`) are mutually exclusive. When one is already running the
 * backend answers 409 and names both it and its kind in
 * `error.details`.
 */
export function getOperationConflict(
  error: unknown,
): OperationConflict | null {
  if (
    error instanceof ApiError &&
    error.code === 'conflict'
  ) {
    const id = error.details?.operation_id

    if (typeof id !== 'string' || id === '') {
      return null
    }

    const kind = error.details?.kind

    return {
      operationId: id,
      kind: typeof kind === 'string' ? kind : null,
    }
  }

  return null
}

export class OperationConflictError extends Error {
  operationId: string
  kind: string | null

  constructor(conflict: OperationConflict) {
    super(
      `Another operation is already running (${conflict.kind ?? 'unknown'} ${conflict.operationId}), so this request was not started. Wait for it to finish, or follow it from the Operations tab.`,
    )

    this.name = 'OperationConflictError'
    this.operationId = conflict.operationId
    this.kind = conflict.kind
  }
}

export interface RunOperationOptions {
  onProgress?: (operation: Operation) => void
  /**
   * Adopt a conflicting operation only when it is this kind. Adoption is
   * opt-in because it means "the user's intent is already being carried
   * out": true for a restart, but false for `world.activate`, where the
   * running operation may be activating a *different* world — adopting it
   * would wait for that world and then report the user's switch as done.
   */
  adoptKind?: string
  onAdopt?: (conflict: OperationConflict) => void
  /** Abort the wait when the component that started it unmounts. */
  signal?: AbortSignal
}

/**
 * Starts a restart-class action and waits for it. A conflict is adopted
 * only when the caller declares the conflicting kind equivalent to its
 * own intent; otherwise it surfaces as an explicit error rather than a
 * false success.
 */
export async function runOperation(
  start: () => Promise<OperationStart>,
  options: RunOperationOptions = {},
): Promise<Operation> {
  let started: OperationStart

  try {
    started = await start()
  } catch (error) {
    const conflict = getOperationConflict(error)

    // Only the start request can report a conflict; anything else (and
    // any failure while polling) is a real error.
    if (conflict === null) {
      throw error
    }

    const adoptable =
      options.adoptKind !== undefined &&
      conflict.kind === options.adoptKind

    if (!adoptable) {
      throw new OperationConflictError(conflict)
    }

    options.onAdopt?.(conflict)

    return waitForOperation(conflict.operationId, options)
  }

  return waitForOperation(started.operation_id, options)
}

export interface UploadProgress {
  loaded: number
  total: number
  percent: number
}

export function uploadWorldWithProgress(
  file: File,
  onProgress: (
    progress: UploadProgress,
  ) => void,
) {
  const formData = new FormData()

  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open(
      'POST',
      `${API_BASE_URL}/api/v1/worlds`,
    )

    request.setRequestHeader(
      'X-Client-Version',
      CLIENT_VERSION,
    )

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return
      }

      const percent = Math.min(
        100,
        Math.round(
          (event.loaded / event.total) * 100,
        ),
      )

      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent,
      })
    }

    request.onload = () => {
      if (
        request.status >= 200 &&
        request.status < 300
      ) {
        try {
          resolve(
            request.responseText
              ? JSON.parse(request.responseText)
              : null,
          )
        } catch {
          resolve(null)
        }

        return
      }

      // XHR bypasses apiFetch, so rebuild the same ApiError the rest of
      // the panel throws; otherwise a rejected upload loses the
      // backend's explanation (for example "not a .wld file").
      let body: unknown

      try {
        body = JSON.parse(request.responseText)
      } catch {
        body = undefined
      }

      reject(
        new ApiError(request.status, body),
      )
    }

    request.onerror = () => {
      reject(
        new Error(
          'Upload failed: the connection to the API was lost.',
        ),
      )
    }

    request.onabort = () => {
      reject(new Error('Upload cancelled.'))
    }

    request.send(formData)
  })
}
