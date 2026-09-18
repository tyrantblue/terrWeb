import { apiFetch } from './client'

export interface ConfigResponse {
  values: Record<string, string>
  editable_keys: string[]
  runtime_keys: string[]
  restart_keys: string[]
  path: string
}

export interface ConfigUpdateResponse {
  persisted: string[]
  changed: string[]
  applied: string[]
  requires_restart: string[]
  operation_id?: string
}

export function getConfig() {
  return apiFetch<ConfigResponse>(
    '/api/v1/config',
  )
}

export function updateConfig(
  values: Record<string, string | number>,
  confirmLowMaxPlayers = false,
) {
  return apiFetch<ConfigUpdateResponse>(
    '/api/v1/config',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
        apply: true,
        ...(confirmLowMaxPlayers
          ? { confirm_low_max_players: true }
          : {}),
      }),
      // The backend persists to serverconfig.txt *before* applying to the
      // running console. If the apply step returns 503 the file is already
      // written, so a replay would find nothing changed and report success
      // while applying nothing.
      retry: false,
    },
  )
}

export function updateMaxPlayers(
  maxPlayers: number,
  confirmLowMaxPlayers = false,
) {
  return updateConfig(
    { maxplayers: maxPlayers },
    confirmLowMaxPlayers,
  )
}


export function updateMotd(
  motd: string,
) {
  return updateConfig({ motd })
}


export function updatePassword(
  password: string,
) {
  return updateConfig({ password })
}
