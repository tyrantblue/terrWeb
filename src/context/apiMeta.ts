import {
  createContext,
  useContext,
} from 'react'

import type { ApiMeta } from '../api/client'

/**
 * Capabilities the backend advertises in `GET /api/meta`. They are the
 * contract for feature-gating: anything not listed is not guaranteed to
 * exist, so the panel must not offer an entry that would 404.
 *
 * The backend advertises twelve as of API 2.0.1. Newer surfaces (guard,
 * scheduler, backups, notifications) still have no capability of their
 * own, so those rely on request-failure degradation instead.
 */
export const CAPABILITIES = {
  serverStatus: 'server.status',
  serverConsole: 'server.console',
  playersList: 'players.list',
  worldList: 'world.list',
  worldUpload: 'world.upload',
  worldSwitch: 'world.switch',
  worldMetadata: 'world.metadata',
  consoleAudit: 'console.audit.persistent',
  serverLogHealth: 'server.log_health',
  serverMetrics: 'server.metrics',
  configPasswordMasked: 'config.password_masked',
  metaHandshake: 'meta.handshake',
} as const

export interface ApiMetaValue {
  meta: ApiMeta | null
  loading: boolean
  error: Error | null
  /**
   * True when the backend advertises the capability. Fails **open**:
   * before the handshake completes, and if it fails, the panel keeps its
   * entries rather than hiding core UI behind a transient network error.
   */
  hasCapability: (name: string) => boolean
}

export const ApiMetaContext =
  createContext<ApiMetaValue | null>(null)

export function useApiMeta() {
  const value = useContext(ApiMetaContext)

  if (value === null) {
    throw new Error(
      'useApiMeta must be used inside an ApiMetaProvider',
    )
  }

  return value
}
