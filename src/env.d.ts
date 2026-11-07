interface ImportMetaEnv {
  /** Optional folder for short links ("go" → /go/<slug>/). Empty (default) = site root. */
  readonly PUBLIC_LINK_PREFIX?: string;
  /** GitHub repository Decap CMS commits to, "owner/repo". */
  readonly PUBLIC_CMS_REPO?: string;
  /** Branch Decap CMS commits to (default "main"). */
  readonly PUBLIC_CMS_BRANCH?: string;
  /** Base URL of the Decap GitHub OAuth proxy. */
  readonly PUBLIC_CMS_OAUTH_URL?: string;
  /** Auth path on the OAuth proxy (default "api/auth"). */
  readonly PUBLIC_CMS_OAUTH_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
