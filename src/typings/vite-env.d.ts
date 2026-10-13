/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_ID: "rpcc" | "dnz";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
