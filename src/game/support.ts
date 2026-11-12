// SPDX-License-Identifier: Apache-2.0
//
// The house's two honest income doors (design spec §9), pure data only:
//
//  1. HOST A FLOOR — the venue-pack sponsorship. A café, studio or bookshop
//     hosts a themed side-floor; the pitch lives on the static
//     /host-a-floor page and the enquiry is a mailto the venue reviews in
//     their own mail client before anything is sent. No form, no backend,
//     no tracking: the privacy promise is unchanged.
//  2. SUPPORT — a single optional donation link, configured at BUILD time
//     (`VITE_SUPPORT_URL`). It renders only when set AND only when it points
//     at one of the known donation platforms over https — a typo'd or
//     hostile value in a build environment can never become a link in the
//     player's About panel.
//
// Nothing here touches the network, and nothing is ever player-facing as an
// ad: both doors are quiet links the player has to choose to walk through.

import { SUPPORT_EMAIL } from './feedback';

/** The origin the absolute in-game links resolve against. The pages.dev
 *  origin is the one that is always live; flip to the custom domain once its
 *  DNS record points at the Pages project. */
export const SITE_ORIGIN = 'https://mirror-house-8fg.pages.dev';

/** The sponsor pitch page (public/host-a-floor.html, served extensionless). */
export const HOST_FLOOR_URL = `${SITE_ORIGIN}/host-a-floor`;

/** Donation platforms a configured support link may point at. Exact host
 *  match (or its `www.`), https only — nothing else ever renders. */
export const SUPPORT_HOSTS: readonly string[] = [
  'github.com',
  'ko-fi.com',
  'buymeacoffee.com',
  'opencollective.com',
  'liberapay.com',
  'patreon.com',
];

/**
 * Gate a configured support URL: the normalized https URL, or null for
 * anything that is not an https link to a known donation platform. On
 * github.com only the `/sponsors/…` path counts — the allowlist names the
 * donation door, not the whole site.
 */
export function safeSupportUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') return null;
  if (url.port !== '') return null;
  const host = url.hostname.replace(/^www\./, '');
  if (!SUPPORT_HOSTS.includes(host)) return null;
  if (host === 'github.com' && !/^\/sponsors\/[A-Za-z0-9-]+\/?$/.test(url.pathname)) return null;
  if (url.pathname === '/' || url.pathname === '') return null; // a platform's front page is nobody's tip jar
  return url.href;
}

/** The enquiry's prefilled subject + body — the checklist the venue answers
 *  in their own words. Plain text; the venue edits it before sending. */
export const HOST_ENQUIRY_SUBJECT = '[Mirror House] Host a floor';
export const HOST_ENQUIRY_BODY = [
  'Hi — we would like to host a floor in Mirror House.',
  '',
  'Venue name: ',
  'City / neighbourhood: ',
  'What we are (café, studio, bookshop, …): ',
  'Website or social link: ',
  'One-line tagline (English; Hindi too if you have it): ',
  'Two brand colours (hex, or just describe them): ',
  'Maze mood (calm and roomy / tight and mean): ',
  '',
  'Anything else: ',
].join('\n');

/** The enquiry mailto — RFC 6068 percent-encoding (encodeURIComponent, so a
 *  space is %20, never the `+` some mail clients render literally). */
export function hostEnquiryMailto(): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    HOST_ENQUIRY_SUBJECT,
  )}&body=${encodeURIComponent(HOST_ENQUIRY_BODY)}`;
}
