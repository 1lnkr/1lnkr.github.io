import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import settings from './data/settings.json';
import { checkAdCode, safeHttpUrl, safeImagePath, slugProblem, SLUG_MAX_LENGTH } from './lib/validate';

/*
 * Schema for src/content/links/*.json — the files Decap CMS writes.
 * It mirrors the fields in src/pages/admin/config.yml.ts. When an entry is invalid
 * (dangerous destination, reserved slug, impossible locker setup, unapproved ad host…)
 * `npm run build` fails with a message naming the file and field, so nothing broken
 * is ever deployed.
 */

// Decap may save an empty optional field as "", null or omit it entirely.
const blank = (value: unknown) => (value === '' || value === null ? undefined : value);

const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const flag = (fallback: boolean) => z.preprocess(blank, z.boolean().default(fallback));
const seconds = (fallback: number, max: number) =>
  z.preprocess(blank, z.coerce.number().int().min(0).max(max).default(fallback));
const stringList = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '' && item != null)
      : typeof value === 'string' && value.trim()
        ? value.split(',').map((item) => item.trim()).filter(Boolean)
        : [],
  z.array(z.string().max(40)).max(20),
);

const lockerStep = z.object({
  type: z.preprocess(blank, z.enum(['acknowledge', 'read', 'wait']).default('acknowledge')),
  title: z.string().trim().min(1, 'Each locker step needs a title.').max(120),
  instruction: text(600),
  // Only for "read" steps: the text the visitor reads (plain text, blank line = new paragraph).
  content: text(5000),
  // "read": minimum seconds before it can be marked as read. "wait": seconds to wait.
  seconds: seconds(5, 120),
  actionLabel: text(60),
});

const adPlacement = z.enum(['inherit', 'top', 'middle', 'bottom']);

const links = defineCollection({
  loader: glob({
    pattern: '**/*.json',
    base: './src/content/links',
    // Keep the entry id equal to the file name (Decap's entry id). Without this, the glob
    // loader would use the custom `slug` field as the id and "Edit in CMS" would break.
    generateId: ({ entry }) => entry.replace(/\.json$/i, ''),
  }),
  schema: z
    .object({
      // ---------------------------------------------------------- Basic information
      title: z.string().trim().min(1, 'Title is required.').max(120),
      // Optional custom slug. Empty → the automatic slug (the file name Decap generated
      // from the title when the link was created), so later title edits never break links.
      slug: z.preprocess(blank, z.string().trim().toLowerCase().max(SLUG_MAX_LENGTH).optional()),
      destination: z.string().trim().min(1, 'Destination URL is required.'),
      image: z.preprocess(blank, z.string().trim().optional()),
      imageAlt: text(200),
      shortDescription: text(300),
      category: text(60),
      tags: stringList,
      published: flag(true),
      // Listed on the homepage dashboard. Off = the short link still works, but the homepage
      // doesn't list it (its destination isn't in the homepage HTML).
      showOnHomepage: flag(true),
      createdAt: z.preprocess(blank, z.coerce.date()),
      updatedAt: z.preprocess(blank, z.coerce.date().optional()),

      // ---------------------------------------------------------- SEO
      seoTitle: text(120),
      metaDescription: text(300),
      canonical: z.preprocess(blank, z.string().trim().optional()),

      // ---------------------------------------------------------- Redirect
      redirectType: z.preprocess(blank, z.enum(['direct', 'locker', 'timer']).default('direct')),

      locker: z.preprocess(
        (value) => value ?? {},
        z.object({
          enabled: flag(true),
          heading: text(120),
          description: text(600),
          // 0 or empty = every listed step is required.
          requiredSteps: z.preprocess(blank, z.coerce.number().int().min(0).max(10).default(0)),
          // Blank list items (no title) that the CMS can leave behind are ignored.
          steps: z.preprocess(
            (value) =>
              Array.isArray(value)
                ? value.filter((step) => step && typeof step === 'object' && String((step as { title?: unknown }).title ?? '').trim() !== '')
                : [],
            z.array(lockerStep).max(10),
          ),
          continueText: text(40),
          minWaitSeconds: seconds(0, 300),
          showProgress: flag(true),
        }),
      ),

      timer: z.preprocess(
        (value) => value ?? {},
        z.object({
          duration: z.preprocess(blank, z.coerce.number().int().min(1).max(300).default(10)),
          heading: text(120),
          description: text(600),
          continueText: text(40),
          autoContinue: flag(false),
          showContinueButton: flag(true),
        }),
      ),

      ads: z.preprocess(
        (value) => value ?? {},
        z.object({
          mode: z.preprocess(blank, z.enum(['inherit', 'on', 'off']).default('inherit')),
          placement: z.preprocess(blank, adPlacement.default('inherit')),
          code: z.preprocess(blank, z.string().max(10000).optional()),
        }),
      ),
    })
    .superRefine((link, ctx) => {
      if (link.slug !== undefined) {
        const problem = slugProblem(link.slug);
        if (problem) ctx.addIssue({ code: 'custom', path: ['slug'], message: problem });
      }

      if (!safeHttpUrl(link.destination)) {
        ctx.addIssue({
          code: 'custom',
          path: ['destination'],
          message: `"${link.destination}" is not allowed. Destinations must be absolute http:// or https:// URLs (no javascript:, data:, file:, credentials or relative paths).`,
        });
      }

      if (link.image && !safeImagePath(link.image)) {
        ctx.addIssue({
          code: 'custom',
          path: ['image'],
          message: 'Featured image must be an uploaded image path (/images/…) or an https:// image URL.',
        });
      }

      if (link.canonical && !safeHttpUrl(link.canonical, { httpsOnly: true })) {
        ctx.addIssue({ code: 'custom', path: ['canonical'], message: 'Canonical URL override must be an absolute https:// URL.' });
      }

      if (link.updatedAt && link.updatedAt < link.createdAt) {
        ctx.addIssue({ code: 'custom', path: ['updatedAt'], message: 'Last updated date cannot be before the creation date.' });
      }

      if (link.redirectType === 'locker' && link.locker.enabled) {
        if (link.locker.steps.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['locker', 'steps'], message: 'A URL Locker needs at least one verification step.' });
        }
        if (link.locker.requiredSteps > link.locker.steps.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['locker', 'requiredSteps'],
            message: `Required steps (${link.locker.requiredSteps}) is more than the number of steps defined (${link.locker.steps.length}).`,
          });
        }
        link.locker.steps.forEach((step, index) => {
          if (step.type === 'read' && !step.content) {
            ctx.addIssue({ code: 'custom', path: ['locker', 'steps', index, 'content'], message: '"Read" steps need some text to read.' });
          }
          if (step.type === 'wait' && step.seconds < 1) {
            ctx.addIssue({ code: 'custom', path: ['locker', 'steps', index, 'seconds'], message: '"Wait" steps need at least 1 second.' });
          }
        });
      }

      if (link.redirectType === 'timer' && !link.timer.autoContinue && !link.timer.showContinueButton) {
        ctx.addIssue({
          code: 'custom',
          path: ['timer', 'showContinueButton'],
          message: 'Enable automatic continuation, the Continue button, or both — otherwise visitors can never leave the timer page.',
        });
      }

      if (link.ads.code) {
        const report = checkAdCode(link.ads.code, settings.ads.allowedHosts);
        for (const problem of report.problems) ctx.addIssue({ code: 'custom', path: ['ads', 'code'], message: problem });
      }
    }),
});

export const collections = { links };
