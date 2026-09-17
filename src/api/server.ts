import { apiFetch } from './client'


export interface ServerPlayers {
  online: number
  max: number
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
