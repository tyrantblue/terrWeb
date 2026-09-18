import { apiFetch } from './client'
import type { OperationStart, WorldMetadata } from './world'


export interface ServerPlayers {
  online: number
  max: number | null
  players: Player[]
}

export interface Player {
  name: string
  ip: string
  port: number
}

export type PlayersResponse = ServerPlayers

export interface ServerWorld {
  file: string
  name: string
  size: number
  modified_at: number
  active: boolean
  /** API 2.0.0+, capability `world.metadata`; `null` for unreadable files. */
  metadata?: WorldMetadata | null
}

export interface ServerStatus {
  running: boolean
  version: string | null
  port: number | null
  max_players: number | null
  time: string | null
  seed: string | null
  motd: string | null
  players: ServerPlayers
  world: ServerWorld | null
  config: Record<string, string>
  /** API 2.0.0+: `config.password` is a mask; this says if one is set. */
  password_set?: boolean
  /** API 2.0.0+: true when the server log pipeline has stopped. */
  log_stalled?: boolean
  /** API 2.0.0+: seconds since the log last advanced. */
  log_age?: number | null
}


export function getServerStatus() {
  return apiFetch<ServerStatus>(
    '/api/v1/server',
  )
}

export function getPlayers() {
  return apiFetch<PlayersResponse>(
    '/api/v1/players',
  )
}


export function saveServer() {
  return apiFetch(
    '/api/v1/server/actions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'save',
      }),
    },
  )
}


export type ServerTime =
  | 'dawn'
  | 'noon'
  | 'dusk'
  | 'midnight'


export function setTime(
  time: ServerTime,
) {
  return apiFetch(
    '/api/v1/server/time',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phase: time,
      }),
    },
  )
}


export function sendSay(
  message: string,
) {
  return apiFetch(
    '/api/v1/broadcast',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
      }),
    },
  )
}


export function kickPlayer(
  player: string,
) {
  return apiFetch(
    `/api/v1/players/${encodeURIComponent(player)}/kick`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}


export function banPlayer(
  player: string,
) {
  return apiFetch(
    `/api/v1/players/${encodeURIComponent(player)}/ban`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}


/**
 * The ban list lives in `banlist.txt`, which the vanilla console only
 * ever appends to — it has no `unban` command. The file does not exist
 * until the first ban, which `exists: false` reports.
 */
export interface BanListResponse {
  bans: string[]
  source: string
  exists: boolean
  note?: string | null
}

export function getBans() {
  return apiFetch<BanListResponse>('/api/v1/bans')
}

/** Removes the name's line from `banlist.txt`. 404 if it is not listed. */
export function unbanPlayer(name: string) {
  return apiFetch(
    `/api/v1/players/${encodeURIComponent(name)}/ban`,
    { method: 'DELETE' },
  )
}


/** Restarts the server process. Returns 202 plus an operation to poll. */
export function restartServer() {
  return apiFetch<OperationStart>(
    '/api/v1/server/restart',
    { method: 'POST' },
  )
}
