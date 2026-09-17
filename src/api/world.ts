import {
  API_BASE_URL,
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
}

export function getWorlds() {
  return apiFetch<WorldListResponse>(
    '/api/world/list',
  )
}

export function switchWorld(file: string) {
  return apiFetch('/api/world/switch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file,
    }),
  })
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
      `${API_BASE_URL}/api/world/upload`,
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
