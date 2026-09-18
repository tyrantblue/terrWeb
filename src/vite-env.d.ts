/// <reference types="vite/client" />

/** Injected by `vite.config.ts` from `package.json`'s `version`. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Optional build-time override for the version sent to the API. */
  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
