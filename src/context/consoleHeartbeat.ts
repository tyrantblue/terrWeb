import {
  createContext,
  useContext,
} from 'react'

import type { HeartbeatState } from '../api/operations'

export interface ConsoleHeartbeatValue {
  /** Derived from the heartbeat job's `last_detail`. */
  state: HeartbeatState
  /** The raw backend detail, for showing the concrete reason. */
  detail: string
  loading: boolean
  refresh: () => Promise<void>
}

export const ConsoleHeartbeatContext =
  createContext<ConsoleHeartbeatValue | null>(null)

export function useConsoleHeartbeat() {
  const value = useContext(ConsoleHeartbeatContext)

  if (value === null) {
    throw new Error(
      'useConsoleHeartbeat must be used inside a ConsoleHeartbeatProvider',
    )
  }

  return value
}
