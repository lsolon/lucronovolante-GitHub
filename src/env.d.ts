/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPSHEET_APP_ID: string
  readonly VITE_APPSHEET_ACCESS_KEY: string
  readonly VITE_APPSHEET_TABLE_NAME: string
  readonly VITE_GA_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
