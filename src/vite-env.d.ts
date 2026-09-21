/// <reference types="vite/client" />

/** Injected by `vite.config.ts` from `package.json`'s `version`. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Optional build-time override for the version sent to the API. */
  readonly VITE_APP_VERSION?: string
  /**
   * Backend origin the panel talks to, e.g. `http://117.72.197.18:8080`.
   * Inlined by Vite at build time; unset falls back to the default API.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
