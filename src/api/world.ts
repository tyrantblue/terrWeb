import { apiFetch } from './client'

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

export function uploadWorld(file: File) {
  const formData = new FormData()

  formData.append('file', file)

  return apiFetch('/api/world/upload', {
    method: 'POST',
    body: formData,
  })
}