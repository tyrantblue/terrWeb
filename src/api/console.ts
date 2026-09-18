import { API_BASE_URL, apiFetch } from './client'

export interface ConsoleLine {
  offset: number
  ts: number | null
  kind: string
  text: string
}


export interface ConsoleResponse {
  lines: ConsoleLine[]
  cursor: number
}


export function getConsole(
  cursor?: number,
) {
  const query = cursor === undefined
    ? '?tail=200'
    : `?since=${cursor}`

  return apiFetch<ConsoleResponse>(
    `/api/v1/console${query}`,
  )
}


export function sendCommand(
  command: string,
) {
  return apiFetch(
    '/api/v1/console/commands',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
      }),
    },
  )
}


export function createConsoleWebSocket() {
  const url = new URL(API_BASE_URL)

  url.protocol =
    url.protocol === 'https:'
      ? 'wss:'
      : 'ws:'
  url.pathname = '/api/v1/console/stream'

  return new WebSocket(
    url.toString(),
  )
}
