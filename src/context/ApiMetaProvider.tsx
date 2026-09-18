import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getApiMeta, type ApiMeta } from '../api/client'
import { ApiMetaContext, type ApiMetaValue } from './apiMeta'

/**
 * Fetches `GET /api/meta` exactly once for the whole panel. The
 * compatibility banner, feature gating and deprecation warnings all read
 * this instead of issuing their own handshake.
 */
export default function ApiMetaProvider({
  children,
}: {
  children: ReactNode
}) {
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let disposed = false

    getApiMeta()
      .then((result) => {
        if (disposed) {
          return
        }

        setMeta(result)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (disposed) {
          return
        }

        // A failed handshake must not block rendering; consumers fall
        // back to "capabilities unknown".
        setError(
          caught instanceof Error
            ? caught
            : new Error('The API handshake failed'),
        )
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false)
        }
      })

    return () => {
      disposed = true
    }
  }, [])

  // Deprecated routes are already avoided, but surfacing the countdown in
  // development keeps it that way. Production stays quiet.
  useEffect(() => {
    if (!import.meta.env.DEV || meta === null) {
      return
    }

    for (const deprecation of meta.deprecations ?? []) {
      const sunset = new Date(deprecation.sunset)
      const days = Math.ceil(
        (sunset.getTime() - Date.now()) / 86_400_000,
      )

      console.warn(
        `[api] ${deprecation.path} is deprecated since ${deprecation.since}; use ${deprecation.replacement}. Sunset in ${days} day(s) (${deprecation.sunset}).`,
      )
    }
  }, [meta])

  const hasCapability = useCallback(
    (name: string) => {
      if (meta === null) {
        return true
      }

      return (meta.capabilities ?? []).includes(name)
    },
    [meta],
  )

  const value = useMemo<ApiMetaValue>(
    () => ({ meta, loading, error, hasCapability }),
    [meta, loading, error, hasCapability],
  )

  return (
    <ApiMetaContext.Provider value={value}>
      {children}
    </ApiMetaContext.Provider>
  )
}
