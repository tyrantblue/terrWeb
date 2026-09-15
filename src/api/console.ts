import { apiFetch } from './client'


export interface ConsoleResponse {
  lines: string[]
}


export function getConsole() {
  return apiFetch<ConsoleResponse>(
    '/api/server/console',
  )
}


export function sendCommand(
  command: string,
) {
  return apiFetch(
    '/api/server/command',
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
  return new WebSocket(
    'wss://terraria-api.tyrantblue.xyz/api/server/ws',
  )
}