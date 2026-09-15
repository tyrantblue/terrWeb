import { apiFetch } from './client'


export interface ServerPlayers {
  online: number
  list: string[]
}


export interface ServerStatus {
  running: boolean
  version: string
  port: number
  max_players: number
  time: string
  seed: string
  motd: string
  players: ServerPlayers
}


export function getServerStatus() {
  return apiFetch<ServerStatus>(
    '/api/server/status',
  )
}


export function saveServer() {
  return apiFetch(
    '/api/server/save',
    {
      method: 'POST',
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
    `/api/server/time/${time}`,
    {
      method: 'POST',
    },
  )
}


export function sendSay(
  message: string,
) {
  return apiFetch(
    '/api/server/say',
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
    '/api/server/kick',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
      }),
    },
  )
}


export function banPlayer(
  player: string,
) {
  return apiFetch(
    '/api/server/ban',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
      }),
    },
  )
}