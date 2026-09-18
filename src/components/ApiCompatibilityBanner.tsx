import { useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, ShieldAlert, X } from 'lucide-react'

import {
  CLIENT_VERSION,
  EXPECTED_API_VERSION,
  getCompatibilityLevel,
} from '../api/client'
import { useApiMeta } from '../context/apiMeta'

type BannerState = {
  severity: 'warning' | 'error'
  message: string
}

/**
 * Derived from the shared `/api/meta` handshake, so this component no
 * longer issues its own request.
 */
function getBanner(
  meta: ReturnType<typeof useApiMeta>['meta'],
  handshakeError: Error | null,
  loading: boolean,
): BannerState | null {
  if (meta === null) {
    // A failed handshake means the version check never ran and feature
    // gating silently fell back to "show everything".
    return !loading && handshakeError !== null
      ? {
          severity: 'warning',
          message: `Could not confirm backend capabilities: ${handshakeError.message}. Some features may be unavailable and the version check was skipped.`,
        }
      : null
  }

  const level = getCompatibilityLevel(
    CLIENT_VERSION,
    meta.api_version,
    meta.min_client_version,
    EXPECTED_API_VERSION,
  )

  switch (level) {
    case 'outdated-client':
      return {
        severity: 'error',
        message: `Panel ${CLIENT_VERSION} is older than this server's minimum supported client ${meta.min_client_version} (API ${meta.api_version}). Refresh to load a newer panel build.`,
      }

    case 'incompatible':
      return {
        severity: 'error',
        message: `This panel speaks API ${EXPECTED_API_VERSION}, but the server reports API ${meta.api_version}. Major versions differ, so some actions may fail.`,
      }

    case 'outdated-server':
      return {
        severity: 'warning',
        message: `This panel targets API ${EXPECTED_API_VERSION}, but the server reports the older ${meta.api_version}. Features added after that release may be unavailable.`,
      }

    case 'newer-server':
      return {
        severity: 'warning',
        message: `The server runs the newer API ${meta.api_version} while this panel targets ${EXPECTED_API_VERSION}. Newer server features may not appear here yet.`,
      }

    default:
      return null
  }
}

export default function ApiCompatibilityBanner() {
  const { meta, loading, error } = useApiMeta()
  const [dismissed, setDismissed] = useState(false)

  const banner = useMemo(
    () => getBanner(meta, error, loading),
    [meta, error, loading],
  )

  if (!banner || dismissed) {
    return null
  }

  const accent = banner.severity === 'error'
    ? {
        wrapper: 'border-red-500/15 bg-red-500/[0.06] text-red-200',
        icon: 'text-red-400',
        button: 'border-red-500/15 bg-red-500/[0.05] text-red-300',
      }
    : {
        wrapper: 'border-amber-500/15 bg-amber-500/[0.06] text-amber-200',
        icon: 'text-amber-400',
        button: 'border-amber-500/15 bg-amber-500/[0.05] text-amber-300',
      }

  const Icon = banner.severity === 'error'
    ? ShieldAlert
    : AlertTriangle

  return (
    <div className={`border-b px-6 py-3 lg:px-8 ${accent.wrapper}`}>
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <Icon size={16} className={`shrink-0 ${accent.icon}`} />
        <p className="min-w-0 flex-1 text-sm">{banner.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`ui-icon-button h-8 w-8 ${accent.button}`}
          title="Refresh panel"
        >
          <RefreshCw size={14} />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={`ui-icon-button h-8 w-8 ${accent.button}`}
          title="Dismiss warning"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
