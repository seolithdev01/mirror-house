// SPDX-License-Identifier: Apache-2.0
//
// step007/T1 — the About panel: everything a stranger who just landed on the
// beta needs on one card — the version (APP_VERSION, injected by vite define),
// a two-line pitch, the beta status with a roadmap tease, the credits (an
// original, open-source work; music generated live), the four launch links,
// and the tagline. The FAQ overlay's modal shape: same box, same trapDialog
// semantics (role=dialog, Tab cycles inside, Escape closes, focus returns to
// the trigger), same backdrop-click close. Two doors in, per the plan: the
// small ⓘ beside 🌐 (hud.ts) and an entry inside ⚙ (settings.ts) — nothing
// else on the default HUD changes. Content is chrome, not content-pipeline
// material: it ships bilingual from day one (en/hi in the i18n table).

import { APP_VERSION } from '../appVersion';
import { trapDialog } from './dialog';
import { HOST_FLOOR_URL, safeSupportUrl } from '../game/support';
import { fill, t, type Lang } from './i18n';

/** The four launch links — label keys (i18n) over absolute URLs. The repo is
 *  the single home for all four; crawlers and players alike get the canonical
 *  https form (never a relative path — the panel may be read off a PWA window
 *  with no address bar to resolve one against). */
export const ABOUT_LINKS: readonly { key: string; href: string }[] = [
  { key: 'about.source', href: 'https://github.com/seolithdev01/mirror-house' },
  {
    key: 'about.privacy',
    href: 'https://github.com/seolithdev01/mirror-house/blob/main/PRIVACY.md',
  },
  {
    key: 'about.provenance',
    href: 'https://github.com/seolithdev01/mirror-house/blob/main/PROVENANCE.md',
  },
  { key: 'about.license', href: 'https://github.com/seolithdev01/mirror-house/blob/main/LICENSE' },
];

/** The support row under the launch links — how the house pays its way
 *  (game/support.ts). "Host a floor" always renders; the donation link only
 *  when the build was configured with a `VITE_SUPPORT_URL` that passes the
 *  donation-platform gate. Kept apart from ABOUT_LINKS: those four are the
 *  project's papers, these are an invitation. */
export function aboutSupportLinks(supportUrl: unknown): { key: string; href: string }[] {
  const links = [{ key: 'about.host', href: HOST_FLOOR_URL }];
  const donate = safeSupportUrl(supportUrl);
  if (donate !== null) links.push({ key: 'about.support', href: donate });
  return links;
}

export interface AboutOverlay {
  root: HTMLElement;
  /** open ↔ closed — the ⓘ button's and the ⚙ entry's click. */
  toggle(): void;
  setLang(lang: Lang): void;
}

export function buildAboutOverlay(): AboutOverlay {
  let lang: Lang = 'en';
  const root = document.createElement('div');
  root.id = 'mh-about-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-about-box';
  const h = document.createElement('h2');
  h.id = 'mh-about-title'; // the dialog's accessible name (trapDialog)
  const version = document.createElement('p');
  version.id = 'mh-about-version';
  const what = document.createElement('p');
  const beta = document.createElement('p');
  const credits = document.createElement('p');
  // The links row: anchors, not buttons — the player reviews the page itself;
  // target=_blank keeps the game (and the run clock) alive underneath.
  const links = document.createElement('nav');
  links.id = 'mh-about-links';
  const anchors: { el: HTMLAnchorElement; key: string }[] = [];
  for (const { key, href } of ABOUT_LINKS) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    anchors.push({ el: a, key });
    links.appendChild(a);
  }
  const support = document.createElement('nav');
  support.id = 'mh-about-support';
  // import.meta.env is vite's; vitest's node world has it too (undefined key)
  for (const { key, href } of aboutSupportLinks(import.meta.env?.VITE_SUPPORT_URL)) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    anchors.push({ el: a, key });
    support.appendChild(a);
  }
  const tagline = document.createElement('p');
  tagline.id = 'mh-about-tagline';
  const close = document.createElement('button');
  close.type = 'button';
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.append(h, version, what, beta, credits, links, support, tagline, close);
  root.appendChild(box);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.hidden = true;
  });
  document.body.appendChild(root);
  trapDialog(root, { labelledBy: 'mh-about-title', onEscape: () => (root.hidden = true) });

  function relabel(): void {
    h.textContent = t(lang, 'about.title');
    version.textContent = fill(t(lang, 'about.version'), { v: APP_VERSION });
    what.textContent = t(lang, 'about.what');
    beta.textContent = t(lang, 'about.beta');
    credits.textContent = t(lang, 'about.credits');
    for (const { el, key } of anchors) el.textContent = t(lang, key);
    tagline.textContent = t(lang, 'about.tagline');
    close.textContent = t(lang, 'aria.close');
    close.setAttribute('aria-label', t(lang, 'aria.close'));
  }
  relabel();
  return {
    root,
    toggle: () => {
      root.hidden = !root.hidden;
    },
    setLang: (next) => {
      if (next === lang) return;
      lang = next;
      relabel();
    },
  };
}
