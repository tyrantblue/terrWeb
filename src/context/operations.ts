import {
  createContext,
  useContext,
} from 'react'

import type { Operation } from '../api/world'

/**
 * Operation kinds the backend serialises: at most one of these may run at
 * a time, and a second request is rejected with 409. Mirrors the backend's
 * `EXCLUSIVE_KINDS` in `app/services/operations.py`.
 *
 * `world.restore` is included even though the backend does not reject it
 * yet (terraria-server issue #12): a restore stops and restarts the server,
 * so letting the panel start a second restart-class action during one is
 * exactly the race this set exists to prevent. Once the backend enforces
 * the combination itself this set should come from `/api/meta` instead of
 * being mirrored by hand.
 */
export const EXCLUSIVE_OPERATION_KINDS = new Set([
  'server.restart',
  'world.activate',
  'world.restore',
  'config.apply',
])

export interface OperationsValue {
  /** Most recent operations first, as the backend returns them. */
  operations: Operation[]
  /**
   * The exclusive operation currently in flight, if any. Callers use it to
   * disable actions that would be rejected with 409 instead of letting the
   * user discover the conflict by clicking.
   */
  activeExclusive: Operation | null
  loading: boolean
  /**
   * Set when the most recent poll failed. The previous list is kept, so
   * consumers must use this — not an empty list — to tell "the API is
   * unreachable" apart from "there are no operations".
   */
  error: Error | null
  refresh: () => Promise<void>
}

export const OperationsContext =
  createContext<OperationsValue | null>(null)

export function useOperations() {
  const value = useContext(OperationsContext)

  if (value === null) {
    throw new Error(
      'useOperations must be used inside an OperationsProvider',
    )
  }

  return value
}

export function isRunning(operation: Operation) {
  return (
    operation.state === 'pending' ||
    operation.state === 'running'
  )
}
