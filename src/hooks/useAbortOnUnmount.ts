import { useEffect, useRef } from 'react'

/**
 * An `AbortSignal` that fires when the component unmounts, so a polling
 * loop started by a click stops instead of continuing to call `setState`
 * on a component that is gone.
 *
 * The controller is re-created on every mount: React's StrictMode runs
 * effects twice in development, and reusing the controller aborted by the
 * first cleanup would cancel the second mount's work immediately.
 */
export function useAbortOnUnmount() {
  const ref = useRef<AbortController | null>(null)

  if (ref.current === null) {
    ref.current = new AbortController()
  }

  useEffect(() => {
    const controller = new AbortController()

    ref.current = controller

    return () => controller.abort()
  }, [])

  return ref
}
