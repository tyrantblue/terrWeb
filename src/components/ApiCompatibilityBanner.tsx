import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'

import {
  CLIENT_VERSION,
  EXPECTED_API_VERSION,
  compareVersions,
  getApiMeta,
} from '../api/client'

export default function ApiCompatibilityBanner() {
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let disposed = false

    getApiMeta()
      .then((meta) => {
        if (disposed) {
          return
        }

        if (
          compareVersions(
            CLIENT_VERSION,
            meta.min_client_version,
          ) < 0
        ) {
          setMessage(
            `Panel ${CLIENT_VERSION} is too old for API ${meta.api_version}. Refresh or update the panel.`,
          )
          return
        }

        if (meta.api_version !== EXPECTED_API_VERSION) {
          setMessage(
            `This panel targets API ${EXPECTED_API_VERSION}, but the server reports ${meta.api_version}. Some features may differ.`,
          )
        }
      })
      .catch((error) => {
        console.error('API compatibility check failed:', error)
      })

    return () => {
      disposed = true
    }
  }, [])

  if (!message || dismissed) {
    return null
  }

  return (
    <div className="border-b border-amber-500/15 bg-amber-500/[0.06] px-6 py-3 text-amber-200 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3">
        <AlertTriangle size={16} className="shrink-0 text-amber-400" />
        <p className="min-w-0 flex-1 text-sm">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ui-icon-button h-8 w-8 border-amber-500/15 bg-amber-500/[0.05] text-amber-300"
          title="Refresh panel"
        >
          <RefreshCw size={14} />
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ui-icon-button h-8 w-8 border-amber-500/15 bg-amber-500/[0.05] text-amber-300"
          title="Dismiss warning"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
