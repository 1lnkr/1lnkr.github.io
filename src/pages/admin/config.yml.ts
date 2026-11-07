import type { APIRoute } from 'astro';
import { absoluteUrl, linkPath } from '../../lib/site';
import { RESERVED_SLUGS, SLUG_MAX_LENGTH } from '../../lib/validate';

/*
 * Decap CMS configuration, generated at build time so the repository, branch, site URL and
 * base path always match the deployment (no hand-edited copies to drift out of sync).
 * Served at /admin/config.yml. JSON is valid YAML, so Decap reads it as-is.
 *
 * Fields here must match the schema in src/content.config.ts.
 *
 * Environment (all public, none are secrets):
 *   PUBLIC_CMS_REPO       "owner/repo" — falls back to GITHUB_REPOSITORY in GitHub Actions
 *   PUBLIC_CMS_BRANCH     default "main"
 *   PUBLIC_CMS_OAUTH_URL       base URL of the OAuth proxy (default https://decap-oauth-bishal.vercel.app)
 *   PUBLIC_CMS_OAUTH_ENDPOINT  auth path on that proxy (default "api/auth")
 */
export const GET: APIRoute = () => {
  const env = import.meta.env;
  const repo = env.PUBLIC_CMS_REPO || process.env.GITHUB_REPOSITORY || '1lnkr/1lnkr.github.io';
  const branch = env.PUBLIC_CMS_BRANCH || 'main';
  // The shared Vercel proxy (github.com/dev-bishal/decap-oauth). Its ALLOWED_ORIGINS
  // must contain https://lnkrs.github.io.
  const oauthUrl = (env.PUBLIC_CMS_OAUTH_URL || 'https://decap-oauth-bishal.vercel.app').replace(/\/+$/, '');
  const oauthEndpoint = (env.PUBLIC_CMS_OAUTH_ENDPOINT || 'api/auth').replace(/^\/+/, '');
  const siteUrl = absoluteUrl('/').replace(/\/$/, '');

  const reserved = RESERVED_SLUGS.map((s) => s.replace(/[-_]/g, (c) => `\\${c}`)).join('|');
  const slugPattern = `^(?!(?:${reserved})$)(?=.{1,${SLUG_MAX_LENGTH}}$)[a-z0-9]+(?:-[a-z0-9]+)*$`;

  const optional = { required: false };

  const lockerStepFields = [
    {
      label: 'Step type',
      name: 'type',
      widget: 'select',
      default: 'acknowledge',
      options: [
        { label: 'Acknowledge — tick a checkbox', value: 'acknowledge' },
        { label: 'Read — read a short text, then confirm', value: 'read' },
        { label: 'Wait — press Start and wait a few seconds', value: 'wait' },
      ],
      hint: 'Only legitimate, non-advertising actions are supported. Ad clicks can never be a step.',
    },
    { label: 'Step title', name: 'title', widget: 'string', ...optional, hint: 'Steps without a title are ignored.' },
    { label: 'Instruction', name: 'instruction', widget: 'text', ...optional, hint: 'Shown under the step title.' },
    {
      label: 'Text to read (Read steps only)',
      name: 'content',
      widget: 'text',
      ...optional,
      hint: 'Plain text. Leave a blank line between paragraphs.',
    },
    {
      label: 'Seconds',
      name: 'seconds',
      widget: 'number',
      value_type: 'int',
      min: 0,
      max: 120,
      default: 5,
      ...optional,
      hint: 'Read: minimum reading time before it can be confirmed. Wait: how long to wait.',
    },
    { label: 'Button / checkbox label', name: 'actionLabel', widget: 'string', ...optional, hint: 'e.g. "I understand" or "Start".' },
  ];

  const linkFields = [
    // -------------------------------------------------------------- Basic information
    { label: 'Title', name: 'title', widget: 'string', hint: 'Shown on locker/timer pages and in social previews.' },
    {
      label: 'Custom slug',
      name: 'slug',
      widget: 'string',
      ...optional,
      pattern: [slugPattern, 'Lowercase letters, numbers and single hyphens only; reserved names such as "admin" are not allowed.'],
      hint: 'Leave empty to generate the slug automatically from the title when the link is first saved. Fill it in to choose your own (e.g. "download-guide"). Changing it later changes the short URL.',
    },
    {
      label: 'Destination URL',
      name: 'destination',
      widget: 'string',
      pattern: ['^https?://[^\\s]+$', 'Must be a full http:// or https:// URL.'],
      hint: 'Where the short link sends visitors. Only http:// and https:// are accepted.',
    },
    {
      label: 'Featured image',
      name: 'image',
      widget: 'image',
      ...optional,
      choose_url: true,
      hint: 'Used on locker/timer pages and as the social sharing image. 1200×630 px works best.',
    },
    { label: 'Image alt text', name: 'imageAlt', widget: 'string', ...optional, hint: 'Describe the image for screen-reader users.' },
    { label: 'Short description', name: 'shortDescription', widget: 'text', ...optional, hint: 'One or two sentences shown under the title.' },
    {
      label: 'Category',
      name: 'category',
      widget: 'string',
      ...optional,
      default: 'Others',
      hint: 'Any name, e.g. "Guides" or "Downloads". Leave empty or keep "Others" for uncategorised links.',
    },
    { label: 'Tags', name: 'tags', widget: 'list', ...optional, allow_add: true, hint: 'Comma-separated.' },
    { label: 'Published', name: 'published', widget: 'boolean', default: true, hint: 'Unpublished links are not built — their URL returns 404.' },
    {
      label: 'Show on homepage',
      name: 'showOnHomepage',
      widget: 'boolean',
      default: true,
      hint: 'Off = the short link still works, but it is not listed on the homepage dashboard.',
    },
    { label: 'Creation date', name: 'createdAt', widget: 'datetime', default: '{{now}}' },
    { label: 'Last updated date', name: 'updatedAt', widget: 'datetime', ...optional, default: '' },

    // -------------------------------------------------------------- SEO
    { label: 'SEO title', name: 'seoTitle', widget: 'string', ...optional, hint: 'Defaults to the Title.' },
    {
      label: 'Meta description (SEO description)',
      name: 'metaDescription',
      widget: 'text',
      ...optional,
      hint: 'Used for the meta description and social previews. Defaults to the Short description.',
    },
    {
      label: 'Canonical URL override',
      name: 'canonical',
      widget: 'string',
      ...optional,
      pattern: ['^https://[^\\s]+$', 'Must be a full https:// URL.'],
      hint: 'Leave empty to use this short link’s own URL.',
    },

    // -------------------------------------------------------------- Redirect
    {
      label: 'Redirect type',
      name: 'redirectType',
      widget: 'select',
      default: 'direct',
      options: [
        { label: 'Direct Redirect — go straight to the destination', value: 'direct' },
        { label: 'URL Locker — complete steps, then click Continue', value: 'locker' },
        { label: 'Timed Redirect — countdown, then continue', value: 'timer' },
      ],
    },
    {
      label: 'URL Locker settings',
      name: 'locker',
      widget: 'object',
      collapsed: true,
      ...optional,
      summary: 'Used when Redirect type is URL Locker',
      fields: [
        { label: 'Enable URL Locker', name: 'enabled', widget: 'boolean', default: true, hint: 'Off = this link behaves like a Direct Redirect.' },
        { label: 'Locker heading', name: 'heading', widget: 'string', ...optional, default: 'Unlock this link' },
        { label: 'Locker description', name: 'description', widget: 'text', ...optional },
        {
          label: 'Number of required steps',
          name: 'requiredSteps',
          widget: 'number',
          value_type: 'int',
          min: 0,
          max: 10,
          default: 0,
          ...optional,
          hint: '0 = all steps below are required. Otherwise visitors may complete any N of them.',
        },
        {
          label: 'Verification steps',
          name: 'steps',
          widget: 'list',
          ...optional,
          default: [],
          add_to_top: false,
          summary: '{{fields.title}} ({{fields.type}})',
          fields: lockerStepFields,
        },
        { label: 'Continue button text', name: 'continueText', widget: 'string', ...optional, default: 'Continue to destination' },
        {
          label: 'Minimum waiting time (seconds)',
          name: 'minWaitSeconds',
          widget: 'number',
          value_type: 'int',
          min: 0,
          max: 300,
          default: 0,
          ...optional,
          hint: 'Optional. Continue stays locked until this many seconds after the page opened.',
        },
        { label: 'Show progress indicator', name: 'showProgress', widget: 'boolean', default: true },
      ],
    },
    {
      label: 'Timed Redirect settings',
      name: 'timer',
      widget: 'object',
      collapsed: true,
      ...optional,
      summary: 'Used when Redirect type is Timed Redirect',
      fields: [
        { label: 'Countdown duration (seconds)', name: 'duration', widget: 'number', value_type: 'int', min: 1, max: 300, default: 10 },
        { label: 'Heading', name: 'heading', widget: 'string', ...optional, default: 'Your link is almost ready' },
        { label: 'Description', name: 'description', widget: 'text', ...optional },
        { label: 'Continue button text', name: 'continueText', widget: 'string', ...optional, default: 'Continue to destination' },
        {
          label: 'Continue automatically',
          name: 'autoContinue',
          widget: 'boolean',
          default: false,
          hint: 'Redirect by itself when the countdown ends. Off = visitors must click Continue.',
        },
        { label: 'Show manual Continue button', name: 'showContinueButton', widget: 'boolean', default: true },
      ],
    },

    // -------------------------------------------------------------- Ads
    {
      label: 'Advertisement settings',
      name: 'ads',
      widget: 'object',
      collapsed: true,
      ...optional,
      summary: 'Override the site-wide ad settings for this link',
      fields: [
        {
          label: 'Advertisements',
          name: 'mode',
          widget: 'select',
          default: 'inherit',
          options: [
            { label: 'Use site settings for this redirect type', value: 'inherit' },
            { label: 'Show ads on this link', value: 'on' },
            { label: 'No ads on this link', value: 'off' },
          ],
          hint: 'The site-wide master switch (Site settings → Ads) must also be on.',
        },
        {
          label: 'Placement',
          name: 'placement',
          widget: 'select',
          default: 'inherit',
          options: [
            { label: 'Site default', value: 'inherit' },
            { label: 'Top — under the title', value: 'top' },
            { label: 'Middle — between the steps/countdown and the Continue area', value: 'middle' },
            { label: 'Bottom — below the Continue area', value: 'bottom' },
          ],
        },
        {
          label: 'Ad code',
          name: 'code',
          widget: 'text',
          ...optional,
          hint: 'Paste approved ad code (e.g. an Adsterra banner) to use instead of the site default. Script hosts must be on the allow-list in Site settings. Code that hides ads, clicks them or redirects is rejected at build time.',
        },
      ],
    },
  ];

  const config = {
    backend: {
      name: 'github',
      repo,
      branch,
      base_url: oauthUrl,
      auth_endpoint: oauthEndpoint,
      commit_messages: {
        create: 'Create {{collection}} “{{slug}}”',
        update: 'Update {{collection}} “{{slug}}”',
        delete: 'Delete {{collection}} “{{slug}}”',
        uploadMedia: 'Upload “{{path}}”',
        deleteMedia: 'Delete “{{path}}”',
      },
    },
    // Lets `npm run cms` (decap-server) edit local files without logging in. Decap only
    // uses it when the admin is opened from localhost.
    local_backend: true,
    site_url: siteUrl,
    display_url: siteUrl,
    logo_url: absoluteUrl('/favicon.svg'),
    media_folder: 'public/images/uploads',
    public_folder: '/images/uploads',
    slug: { encoding: 'ascii', clean_accents: true, sanitize_replacement: '-' },
    collections: [
      {
        name: 'links',
        label: 'Links',
        label_singular: 'Link',
        description: `Short links. Each published link becomes ${linkPath('<slug>')}. Every save commits to GitHub and triggers a rebuild (≈1–2 minutes).`,
        folder: 'src/content/links',
        create: true,
        delete: true,
        format: 'json',
        extension: 'json',
        identifier_field: 'title',
        // "View Live" button → /admin/live/<file name>/ → redirects to the short link
        // (which may use a custom slug). See src/pages/admin/live/[id].astro.
        preview_path: 'admin/live/{{slug}}/',
        // File name = automatic slug, generated once from the title when the link is created.
        slug: '{{slug}}',
        summary: '{{title}} · {{redirectType}} · {{published}}',
        sortable_fields: ['createdAt', 'title', 'redirectType'],
        view_filters: [
          { label: 'Direct', field: 'redirectType', pattern: 'direct' },
          { label: 'Locker', field: 'redirectType', pattern: 'locker' },
          { label: 'Timer', field: 'redirectType', pattern: 'timer' },
          { label: 'Drafts', field: 'published', pattern: false },
          { label: 'Hidden from homepage', field: 'showOnHomepage', pattern: false },
        ],
        view_groups: [{ label: 'Redirect type', field: 'redirectType' }],
        fields: linkFields,
      },
      {
        name: 'settings',
        label: 'Site settings',
        editor: { preview: false },
        files: [
          {
            name: 'site',
            label: 'Site & advertising settings',
            file: 'src/data/settings.json',
            format: 'json',
            fields: [
              { label: 'Site name', name: 'siteName', widget: 'string' },
              { label: 'Site description', name: 'siteDescription', widget: 'text' },
              { label: 'Owner name (footer)', name: 'ownerName', widget: 'string', ...optional },
              { label: 'Default social image', name: 'defaultSocialImage', widget: 'image', ...optional, hint: 'Used when a link has no featured image. 1200×630 PNG/JPG.' },
              { label: 'Default social image alt text', name: 'defaultSocialImageAlt', widget: 'string', ...optional },
              { label: 'X/Twitter handle', name: 'twitterHandle', widget: 'string', ...optional, hint: 'e.g. @yourname' },
              { label: 'Allow search engines to index the dashboard homepage', name: 'indexHomepage', widget: 'boolean', default: true },
              {
                label: 'Ads',
                name: 'ads',
                widget: 'object',
                fields: [
                  { label: 'Enable advertisements (master switch)', name: 'enabled', widget: 'boolean', default: false },
                  {
                    label: 'Show on Direct Redirect pages',
                    name: 'showOnDirect',
                    widget: 'boolean',
                    default: false,
                    hint: 'Not recommended: direct links redirect instantly, so the ad only appears on the no-JavaScript fallback page.',
                  },
                  { label: 'Show on URL Locker pages', name: 'showOnLocker', widget: 'boolean', default: true },
                  { label: 'Show on Timed Redirect pages', name: 'showOnTimer', widget: 'boolean', default: true },
                  { label: 'Ad label', name: 'label', widget: 'string', default: 'Advertisement' },
                  {
                    label: 'Default placement',
                    name: 'defaultPlacement',
                    widget: 'select',
                    default: 'bottom',
                    options: [
                      { label: 'Top — under the title', value: 'top' },
                      { label: 'Middle — between content and the Continue area', value: 'middle' },
                      { label: 'Bottom — below the Continue area', value: 'bottom' },
                    ],
                  },
                  {
                    label: 'Default ad code',
                    name: 'defaultCode',
                    widget: 'text',
                    ...optional,
                    hint: 'Approved ad code (e.g. an Adsterra banner) used on every page where ads are enabled. Rendered exactly as pasted inside a labelled ad box.',
                  },
                  {
                    label: 'Allowed ad hosts',
                    name: 'allowedHosts',
                    widget: 'list',
                    hint: 'Domains ad code may load scripts/iframes from (subdomains included), comma-separated. The build fails if ad code uses any other host.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const header = [
    '# Decap CMS configuration — generated by src/pages/admin/config.yml.ts at build time.',
    '# Edit that file (not the deployed copy). JSON syntax is valid YAML.',
    '',
  ].join('\n');

  return new Response(`${header}${JSON.stringify(config, null, 2)}\n`, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};
