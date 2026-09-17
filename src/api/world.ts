import {
  API_BASE_URL,
  CLIENT_VERSION,
  apiFetch,
} from './client'

export interface World {
  name: string
  file: string
  size: number
  modified_at: number
  active: boolean
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
}

export type OperationState =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'

export interface Operation {
  id: string
  kind: string
  state: OperationState
  progress: number | null
  message: string | null
  error: string | Record<string, unknown> | null
}

export function switchWorld(file: string) {
  return apiFetch<OperationStart>(
    `/api/v1/worlds/${encodeURIComponent(file)}/activate`,
    {
      method: 'POST',
    },
  )
}

export function getOperation(id: string) {
  return apiFetch<Operation>(
    `/api/v1/operations/${encodeURIComponent(id)}`,
  )
}

export async function waitForOperation(
  id: string,
  onProgress?: (operation: Operation) => void,
) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const operation = await getOperation(id)

    onProgress?.(operation)

    if (operation.state === 'succeeded') {
      return operation
    }

    if (operation.state === 'failed') {
      const detail = typeof operation.error === 'string'
        ? operation.error
        : operation.message

      throw new Error(
        detail ?? 'Operation failed',
      )
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 750)
    })
  }

  throw new Error('Operation timed out')
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

      reject(
        new Error(
          `API request failed: ${request.status}`,
        ),
      )
    }

    request.onerror = () => {
      reject(
        new Error('Upload request failed'),
      )
    }

    request.send(formData)
  })
}
