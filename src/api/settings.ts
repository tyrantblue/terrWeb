import { apiFetch } from './client'

export interface ConfigResponse {
  values: Record<string, string>
  /**
   * Since API 2.0.0 `values.password` is a mask, so this flag — not the
   * value — tells you whether a password is configured.
   */
  password_set?: boolean
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

/**
 * API 2.0.0+ masks `password` in GET responses, and submitting the mask
 * back is a 400 by design (`error.details.key === "password"`). Strip it
 * from every outgoing payload so a future generic form cannot replay it.
 * An explicit `""` still passes through — that is the documented way to
 * clear the password.
 */
export function isPasswordMask(value: string) {
  return /^\u2022+$/.test(value.trim())
}

export function buildConfigPayload(
  values: Record<string, string | number>,
) {
  const payload: Record<string, string | number> = {}

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && isPasswordMask(value)) {
      continue
    }

    payload[key] = value
  }

  return payload
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
        values: buildConfigPayload(values),
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
