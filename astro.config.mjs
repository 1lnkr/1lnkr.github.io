// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

/*
 * Deployment target: the GitHub Pages user/organisation site https://lnkrs.github.io/
 * (repository Lnkrs/Lnkrs.github.io, so the base path is "/").
 *
 * Resolution order for the site URL and base path:
 *   1. PUBLIC_SITE_URL / PUBLIC_BASE_PATH (env vars or GitHub repository variables)
 *   2. GITHUB_REPOSITORY ("owner/repo") — set automatically inside GitHub Actions
 *   3. Local fallback below (https://lnkrs.github.io + "/")
 */
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserSite = repo ? repo.toLowerCase() === `${owner?.toLowerCase()}.github.io` : false;

const site = env.PUBLIC_SITE_URL || (owner ? `https://${owner.toLowerCase()}.github.io` : 'https://lnkrs.github.io');
const base = env.PUBLIC_BASE_PATH || (repo ? (isUserSite ? '/' : `/${repo}`) : '/');

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  // Nothing in this project needs client-side routing or prefetching.
  prefetch: false,
  devToolbar: { enabled: false },
});
