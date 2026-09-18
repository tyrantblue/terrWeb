import {
  createContext,
  useContext,
} from 'react'

import type { ServerStatus } from '../api/server'

/**
 * Current connectivity, derived once in the provider so every consumer
 * agrees. `offline` still means the API answered — it is the *game*
 * server that is down, which needs a different fix than an unreachable
 * API.
 */
export type Connectivity =
  | 'connecting'
  | 'unreachable'
  | 'online'
  | 'offline'

export interface ServerStatusValue {
  /** Latest successful `/api/v1/server` payload, or null before one. */
  status: ServerStatus | null
  /** Set when the most recent request failed; cleared on the next success. */
  error: Error | null
  /** True until the first request settles. */
  loading: boolean
  /** Epoch milliseconds of the last successful request. */
  lastUpdated: number | null
  connectivity: Connectivity
  refresh: () => Promise<void>
}

export const ServerStatusContext =
  createContext<ServerStatusValue | null>(null)

export function useServerStatus() {
  const value = useContext(ServerStatusContext)

  if (value === null) {
    throw new Error(
      'useServerStatus must be used inside a ServerStatusProvider',
    )
  }

  return value
}
