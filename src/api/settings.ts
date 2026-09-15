import { apiFetch } from './client'


export function updateMaxPlayers(
  maxPlayers: number,
) {
  return apiFetch(
    '/api/server/maxplayers',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_players: maxPlayers,
      }),
    },
  )
}


export function updateMotd(
  motd: string,
) {
  return apiFetch(
    '/api/server/motd',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        motd,
      }),
    },
  )
}


export function updatePassword(
  password: string,
) {
  return apiFetch(
    '/api/server/password',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
      }),
    },
  )
}