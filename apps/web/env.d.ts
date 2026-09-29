/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL for production builds, e.g. https://api.stoperica.hr/api. Defaults to `/api`. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
