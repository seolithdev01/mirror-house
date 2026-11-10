// SPDX-License-Identifier: Apache-2.0
import { FOG_COST } from '../engine/constants';
import type { InputMode } from '../engine/input';
import { trapDialog } from './dialog';
import { fill, t, type Lang } from './i18n';

/** T2/T5 — how long the Truth-Shard I interstitial holds before it dismisses
 *  itself (the descend hold beneath it stays DESCEND_MS = 0.8s, so the banner
 *  rides ~1s into the Hall of Ancestors before fading — a celebration, never
 *  a gate). */
export const SHARD_INTERSTITIAL_MS = 1800;

export type HudInit = {
  mode: InputMode;
  onMode(m: InputMode): void;
  onFaq(): void;
  /** M3/T2 — opens/closes Aaina's dialogue panel ([Q] does the same). */
  onAaina(): void;
  onDaily(): void;
  onFrost(): void;
  /** M3/T6 — toggles the audio mute (same as the [M] key). */
  onMute(): void;
  /** M4/T2 — tier complete → a fresh random-base campaign (Play again). */
  onPlayAgain(): void;
  /** M4/T2 — tier complete → free walk in the cleared Dwaar (Stay). */
  onStay(): void;
  /** M4/T4 — 💾: serialize the IDB save v2 to a file (FS Access or download). */
  onExport(): void;
  /** M4/T4 — 📂: pick a file, validate, store, reload. */
  onImport(): void;
  /** M4/T6 — the 🌐 button: cycle the UI language (en ↔ hi). */
  onLang(): void;
  /** M5/T1 — the ⚙ button: open/close the settings overlay. */
  onSettings(): void;
  /** step007/T1 — the ⓘ button (beside 🌐): open/close the About panel. */
  onAbout(): void;
  /** step007/T2 — the 📮 button (beside ⓘ): open/close the feedback composer. */
  onFeedback(): void;
};
export interface Hud {
  setMode(mode: InputMode): void;
  setChips(chips: {
    streak?: number;
    bestMs?: number | null;
    timerMs?: number | null;
    beacons?: { captured: number; total: number };
    /** M4/T7 — the unified shards display: the plain banked count, or the
     *  `banked (+pending)` string main's single writer composes. */
    shards?: number | string;
  }): void;
  setBreath(v: number): void;
  setAnger(v: number): void;
  /** M3/T3 — the view chip: which ViewMode the renderer is showing ([V] cycles). */
  setView(label: string): void;
  /** M3/T6 — the 🔊/🔇 button label follows the audio engine's mute state. */
  setMuted(muted: boolean): void;
  /** M4/T2 — the floor chip (`L02`, `L10 · DWAAR I ✦` on the threshold floor). */
  setFloor(label: string): void;
  showCleared(ms: number, bestMs: number | null, isBest: boolean): void;
  hideCleared(): void;
  /** M6/T1 — the venue side-floor banner: pack name, its tagline, the
   *  no-banking note, and the back-to-campaign button. Shown while a venue
   *  pack's floor is live; hidden by the return. */
  showVenue(info: {
    title: string;
    tagline: string;
    note: string;
    returnLabel: string;
    onReturn(): void;
  }): void;
  hideVenue(): void;
  /** M6/T1 — the venue floor's clear line: no best-time/shards sentence (a
   *  side-floor banks nothing), just "cleared — return". */
  showVenueCleared(text: string): void;
  /** M4/T2 — the 0.8s `descending…` banner between floors; hide on rebuild. */
  showDescend(): void;
  hideDescend(): void;
  /** T2/T5 — the Truth-Shard I interstitial (the T1 adjudication): Dwaar I's
   *  clear raises the tier-complete styling as a 1.8s auto-dismiss banner —
   *  the 0.8s descend hold beneath it is untouched, and the banner owns its
   *  own clock (a floor rebuild never hides it). T3/T1: Dwaar II takes the
   *  same banner (`which: 2` names its own shard line). T4/T1: Dwaar III
   *  cascades to the same banner (`which: 3`) — the full screen belongs to
   *  the ACT CLOSE Dwaar IV raises (`showTierComplete({ tier: 4 })`). */
  showShardInterstitial(which?: 1 | 2 | 3): void;
  /** M4/T2 — the Truth-Shard tier-complete screen (Play again / Stay).
   *  T2/T1 — `tier` picks the screen's title: 1 = Dwaar I, 2 = Dwaar II.
   *  T3/T1 — 3 = Dwaar III. T4/T1 — 4 = Dwaar IV, the ACT I completion
   *  screen: the same overlay re-styled (the `.act` class), the campaign
   *  stats line, and the Act II teaser in place of the free-walk note. */
  showTierComplete(stats: { tier: 1 | 2 | 3 | 4; floors: number; shards: number }): void;
  hideTier(): void;
  showFail(reason: string): void;
  hideFail(): void;
  /** One line of in-world guidance; null hides it (T7 passages will drive it). */
  hint(text: string | null): void;
  /** M4/T4 — a short-lived notice (import rejections, export confirmations).
   *  Separate from hint(): the frame loop rewrites hint() every frame. */
  toast(text: string): void;
  /** M4/T6 — re-label every chrome string this HUD owns (buttons, chips,
   *  overlays) in the new language; values recompose from cached state. */
  setLang(lang: Lang): void;
  /** M5/T3 — the caption bar (#mh-captions, bottom-center). main feeds it
   *  renderCaptions(el, feed, now) every frame; its fade is the reduced-flash
   *  CSS family. A polite live region: the lines read themselves. */
  captionBar: HTMLElement;
  root: HTMLElement;
}

function chip(label: string, id: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'mh-chip';
  el.id = `mh-${id}`;
  el.textContent = label;
  return el;
}

export function createHud(init: HudInit): Hud {
  // M4/T6 — every chrome string this HUD owns flows through t(); setLang()
  // flips the value and relabels in place. 'en' until the first setLang()
  // (main calls one at boot, so the paint is right from frame one).
  let lang: Lang = 'en';
  const root = document.createElement('div');
  root.id = 'hud';
  const modes = document.createElement('div');
  modes.id = 'mh-modes';
  const buttons: Record<string, HTMLButtonElement> = {};
  for (const m of ['keyboard', 'mouse', 'hybrid'] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.mode = m;
    b.textContent = t(lang, `mode.${m}`);
    b.addEventListener('click', () => init.onMode(m));
    buttons[m] = b;
    modes.appendChild(b);
  }
  // M4/T6 — 🌐 cycles en ↔ hi next to the mode buttons; its label names the
  // language it switches TO (हिं while English, EN while Hindi).
  const langBtn = document.createElement('button');
  langBtn.type = 'button';
  langBtn.id = 'mh-lang';
  langBtn.addEventListener('click', () => init.onLang());
  modes.appendChild(langBtn);
  // step007/T1 — a small ⓘ sits beside 🌐 (the launch kit's one allowed HUD
  // addition): it opens the About panel — version, pitch, beta, credits,
  // links. The ⚙ entry inside settings opens the same panel.
  const aboutBtn = document.createElement('button');
  aboutBtn.type = 'button';
  aboutBtn.id = 'mh-about';
  aboutBtn.addEventListener('click', () => init.onAbout());
  modes.appendChild(aboutBtn);
  // step007/T2 — 📮 sits beside ⓘ: the feedback composer (bug / suggestion /
  // a kind word) with the diagnostics the player reviews before sending. The
  // ⚙ entry opens the same overlay.
  const feedbackBtn = document.createElement('button');
  feedbackBtn.type = 'button';
  feedbackBtn.id = 'mh-feedback';
  feedbackBtn.addEventListener('click', () => init.onFeedback());
  modes.appendChild(feedbackBtn);
  // M5/T1 — ⚙ sits next to 🌐 and opens the settings overlay (Display:
  // text scale; Access: reduced-flash + captions — the a11y front door).
  const gearBtn = document.createElement('button');
  gearBtn.type = 'button';
  gearBtn.id = 'mh-settings';
  gearBtn.textContent = '⚙';
  gearBtn.addEventListener('click', () => init.onSettings());
  modes.appendChild(gearBtn);
  const faq = document.createElement('button');
  faq.type = 'button';
  faq.id = 'mh-faq';
  faq.addEventListener('click', () => init.onFaq());
  const aaina = document.createElement('button');
  aaina.type = 'button';
  aaina.id = 'mh-aaina';
  aaina.addEventListener('click', () => init.onAaina());
  const daily = document.createElement('button');
  daily.type = 'button';
  daily.id = 'mh-daily';
  daily.addEventListener('click', () => init.onDaily());
  const frost = document.createElement('button');
  frost.type = 'button';
  frost.id = 'mh-frost';
  frost.addEventListener('click', () => init.onFrost());
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.id = 'mh-mute';
  mute.addEventListener('click', () => init.onMute());
  // M4/T4 — the save chain's front door: export the IDB save, import one back.
  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.id = 'mh-export';
  exportBtn.textContent = '💾';
  exportBtn.addEventListener('click', () => init.onExport());
  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.id = 'mh-import';
  importBtn.textContent = '📂';
  importBtn.addEventListener('click', () => init.onImport());
  const chips = document.createElement('div');
  chips.id = 'mh-chips';
  chips.append(
    chip('', 'view'),
    chip('', 'floor'),
    chip('', 'streak'),
    chip('', 'best'),
    chip('', 'timer'),
    chip('', 'beacons'),
    chip('', 'shards'),
  );
  const breath = document.createElement('div');
  breath.id = 'mh-breath';
  const breathFill = document.createElement('div');
  breathFill.id = 'mh-breath-fill';
  breath.appendChild(breathFill);
  const anger = document.createElement('div');
  anger.id = 'mh-anger';
  const angerFill = document.createElement('div');
  angerFill.id = 'mh-anger-fill';
  anger.appendChild(angerFill);
  const cleared = document.createElement('div');
  cleared.id = 'mh-cleared';
  cleared.hidden = true;
  const descend = document.createElement('div');
  descend.id = 'mh-descend';
  descend.hidden = true;
  // T2/T5 — the Truth-Shard I interstitial: the tier-complete card's styling
  // as a centered banner. It owns its own hide clock (below), so a descend's
  // buildFloor sweep — which hides the cleared/descend/tier surfaces — never
  // cuts the 1.8s celebration short.
  const shard = document.createElement('div');
  shard.id = 'mh-shard';
  shard.hidden = true;
  const fail = document.createElement('div');
  fail.id = 'mh-fail';
  fail.hidden = true;
  const hint = document.createElement('div');
  hint.id = 'mh-hint';
  hint.hidden = true;
  const toast = document.createElement('div');
  toast.id = 'mh-toast';
  toast.hidden = true;
  // M6/T1 — the venue side-floor banner. The whole card rides the HUD column
  // (pointer-events:none); only its button owns clicks.
  const venueBanner = document.createElement('div');
  venueBanner.id = 'mh-venue';
  venueBanner.hidden = true;
  const venueTitle = document.createElement('div');
  venueTitle.id = 'mh-venue-title';
  const venueTagline = document.createElement('p');
  venueTagline.id = 'mh-venue-tagline';
  const venueNoteEl = document.createElement('p');
  venueNoteEl.id = 'mh-venue-note';
  venueNoteEl.className = 'mh-venue-note';
  const venueReturn = document.createElement('button');
  venueReturn.type = 'button';
  venueReturn.id = 'mh-venue-return';
  /** The live onReturn — swapped by every showVenue (one listener, one button). */
  let venueOnReturn: (() => void) | null = null;
  venueReturn.addEventListener('click', () => venueOnReturn?.());
  venueBanner.append(venueTitle, venueTagline, venueNoteEl, venueReturn);
  // M5/T3 — the caption bar: fixed bottom-center (out of the top-right
  // column's flow), role=status so the lines announce themselves. Its text
  // is renderCaptions' output; main owns the feed.
  const captionBar = document.createElement('div');
  captionBar.id = 'mh-captions';
  captionBar.hidden = true;
  captionBar.setAttribute('role', 'status');
  captionBar.setAttribute('aria-live', 'polite');
  root.append(
    modes,
    faq,
    aaina,
    daily,
    frost,
    mute,
    exportBtn,
    importBtn,
    chips,
    venueBanner,
    breath,
    anger,
    cleared,
    descend,
    shard,
    fail,
    hint,
    toast,
    captionBar,
  );
  document.body.appendChild(root);

  // M4/T2 tier-complete screen — a modal like the FAQ's, appended to the body
  // (not the pointer-events:none #hud root) so its buttons own the clicks.
  // M5/T6 — dialog semantics: role=dialog + aria-modal, focus lands on
  // ↻ Play again when the screen rises and returns to the trigger when it
  // falls; Tab cycles the two choices and never escapes (no Escape close —
  // the shard is claimed, the screen wants a choice, not an exit).
  const tier = document.createElement('div');
  tier.id = 'mh-tier-overlay';
  tier.hidden = true;
  const tierBox = document.createElement('div');
  tierBox.id = 'mh-tier-box';
  const tierTitle = document.createElement('h2');
  tierTitle.id = 'mh-tier-title';
  const tierStats = document.createElement('p');
  const tierButtons = document.createElement('div');
  tierButtons.id = 'mh-tier-buttons';
  const playAgain = document.createElement('button');
  playAgain.type = 'button';
  playAgain.id = 'mh-tier-again';
  playAgain.addEventListener('click', () => init.onPlayAgain());
  const stay = document.createElement('button');
  stay.type = 'button';
  stay.id = 'mh-tier-stay';
  stay.addEventListener('click', () => init.onStay());
  const tierNote = document.createElement('p');
  tierNote.id = 'mh-tier-note';
  tierButtons.append(playAgain, stay);
  tierBox.append(tierTitle, tierStats, tierButtons, tierNote);
  tier.appendChild(tierBox);
  document.body.appendChild(tier);
  trapDialog(tier, { labelledBy: 'mh-tier-title' }); // M5/T6 — self-managing

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  let hintText: string | null = null; // last shown hint (hint() early-returns on repeats)
  let toastTimer = 0; // the toast's own hide timer (re-toast restarts the clock)
  // T2/T5 — the interstitial's own hide clock, same contract as the toast's.
  // T3/T1 — the live shard line (I or II), so setLang re-localizes the banner
  // that is actually on screen. T4/T1 — III joins the set.
  let shardTimer = 0;
  let shardKey = 'overlay.shardInterstitial';
  // M4/T6 — the last values fed to the value-bearing setters, so setLang() can
  // recompose every label-bearing surface (chips, mute, tier) without main
  // re-feeding them. Derived display state, not a second truth: the values'
  // owners still write them.
  let muted = false;
  let lastTierStats: { tier: 1 | 2 | 3 | 4; floors: number; shards: number } | null = null;
  const lastChips: {
    streak?: number;
    bestMs?: number | null;
    timerMs?: number | null;
    beacons?: { captured: number; total: number };
    shards?: number | string; // M4/T7 — the unified display, composed upstream
  } = {};

  const chipText = (id: string, text: string): void => {
    const el = document.getElementById(`mh-${id}`);
    if (el !== null) el.textContent = text;
  };
  /** Compose the five value chips from the cache — called by setChips (merge
   *  first) and by setLang (relabel with the values already on screen). */
  function renderChips(): void {
    if (lastChips.streak !== undefined)
      chipText('streak', `🔥 ${t(lang, 'chip.streak')} ${lastChips.streak}`);
    if (lastChips.bestMs !== undefined)
      chipText(
        'best',
        `⏱ ${t(lang, 'chip.best')} ${lastChips.bestMs == null ? '—' : fmt(lastChips.bestMs)}`,
      );
    if (lastChips.timerMs !== undefined)
      chipText(
        'timer',
        `⏳ ${t(lang, 'chip.timer')} ${lastChips.timerMs == null ? '—' : fmt(lastChips.timerMs)}`,
      );
    if (lastChips.beacons !== undefined)
      chipText(
        'beacons',
        `🪞 ${t(lang, 'chip.beacons')} ${lastChips.beacons.captured}/${lastChips.beacons.total}`,
      );
    if (lastChips.shards !== undefined)
      chipText('shards', `💠 ${t(lang, 'chip.shards')} ${lastChips.shards}`);
  }

  /** The tier screen's title key — one place, so the three call sites
   *  (relabelStatic, showTierComplete, setLang) can never drift apart.
   *  T3/T1: tier 3 names Dwaar III's Truth-Shard III screen. T4/T1: tier 4
   *  names the ACT I completion screen Dwaar IV raises. */
  const tierTitleKey = (tier: 1 | 2 | 3 | 4): string =>
    tier === 4
      ? 'overlay.actTitle'
      : tier === 3
        ? 'overlay.tierTitle3'
        : tier === 2
          ? 'overlay.tierTitle2'
          : 'overlay.tierTitle';

  /** The tier screen's note key — the free-walk line for the tier screens,
   *  the Act II teaser for the act close (T4/T1). */
  const tierNoteKey = (tier: 1 | 2 | 3 | 4): string =>
    tier === 4 ? 'overlay.actNote' : 'overlay.tierNote';

  /** One place that knows every static chrome label — boot and setLang().
   *  M5/T6: every HUD button also carries an aria-label from the same table —
   *  the emoji-prefixed and icon-only buttons get a stable accessible name,
   *  and it flips with the language like the visible text. */
  function relabelStatic(): void {
    for (const m of Object.keys(buttons)) {
      const b = buttons[m]!;
      b.textContent = t(lang, `mode.${m}`);
      b.setAttribute('aria-label', t(lang, `mode.${m}`));
    }
    langBtn.textContent = t(lang, lang === 'en' ? 'btn.langHi' : 'btn.langEn');
    langBtn.title = t(lang, 'btn.langTitle');
    langBtn.setAttribute('aria-label', t(lang, 'btn.langTitle'));
    aboutBtn.textContent = 'ⓘ';
    aboutBtn.title = t(lang, 'btn.about');
    aboutBtn.setAttribute('aria-label', t(lang, 'btn.about'));
    feedbackBtn.textContent = '📮';
    feedbackBtn.title = t(lang, 'btn.feedback');
    feedbackBtn.setAttribute('aria-label', t(lang, 'btn.feedback'));
    gearBtn.textContent = '⚙';
    gearBtn.title = t(lang, 'btn.settings');
    gearBtn.setAttribute('aria-label', t(lang, 'btn.settings'));
    faq.textContent = t(lang, 'btn.faq');
    faq.setAttribute('aria-label', t(lang, 'btn.faq'));
    aaina.textContent = t(lang, 'btn.aaina');
    aaina.setAttribute('aria-label', t(lang, 'btn.aaina'));
    daily.textContent = t(lang, 'btn.daily');
    daily.setAttribute('aria-label', t(lang, 'btn.daily'));
    frost.textContent = t(lang, 'btn.frost');
    frost.setAttribute('aria-label', t(lang, 'btn.frost'));
    mute.textContent = t(lang, muted ? 'btn.muted' : 'btn.mute');
    mute.setAttribute('aria-label', t(lang, muted ? 'btn.muted' : 'btn.mute'));
    exportBtn.textContent = '💾';
    exportBtn.title = t(lang, 'btn.export');
    exportBtn.setAttribute('aria-label', t(lang, 'btn.export'));
    importBtn.textContent = '📂';
    importBtn.title = t(lang, 'btn.import');
    importBtn.setAttribute('aria-label', t(lang, 'btn.import'));
    tierTitle.textContent = t(lang, tierTitleKey(lastTierStats?.tier ?? 1));
    playAgain.textContent = t(lang, 'misc.playAgain');
    playAgain.setAttribute('aria-label', t(lang, 'misc.playAgain'));
    stay.textContent = t(lang, 'misc.stay');
    stay.setAttribute('aria-label', t(lang, 'misc.stay'));
    tierNote.textContent = t(lang, tierNoteKey(lastTierStats?.tier ?? 1));
  }
  relabelStatic();

  const setMode = (mode: InputMode) => {
    for (const m of Object.keys(buttons)) buttons[m]!.classList.toggle('active', m === mode);
  };
  setMode(init.mode);
  return {
    setMode,
    setChips: (c) => {
      Object.assign(lastChips, c);
      renderChips();
    },
    setBreath: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      breathFill.style.width = `${(clamped * 100).toFixed(1)}%`;
      frost.disabled = clamped < FOG_COST; // no click-spam when there is not enough breath
    },
    setAnger: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      angerFill.style.width = `${(clamped * 100).toFixed(1)}%`;
    },
    setView: (label) => {
      (document.getElementById('mh-view') as HTMLElement).textContent = `👁 ${label}`;
    },
    setMuted: (m) => {
      muted = m;
      mute.textContent = t(lang, m ? 'btn.muted' : 'btn.mute');
      mute.setAttribute('aria-label', t(lang, m ? 'btn.muted' : 'btn.mute')); // M5/T6
    },
    setFloor: (label) => {
      (document.getElementById('mh-floor') as HTMLElement).textContent = label;
    },
    showCleared: (ms, bestMs, isBest) => {
      cleared.hidden = false;
      cleared.textContent = fill(t(lang, isBest ? 'overlay.clearedBest' : 'overlay.cleared'), {
        s: fmt(ms),
        best: bestMs == null ? '—' : fmt(bestMs),
      });
    },
    hideCleared: () => {
      cleared.hidden = true;
    },
    showVenue: ({ title, tagline, note, returnLabel, onReturn }) => {
      venueTitle.textContent = title;
      venueTagline.textContent = tagline;
      venueNoteEl.textContent = note;
      venueReturn.textContent = returnLabel;
      venueReturn.setAttribute('aria-label', returnLabel);
      venueOnReturn = onReturn;
      venueBanner.hidden = false;
    },
    hideVenue: () => {
      venueBanner.hidden = true;
      venueOnReturn = null; // a hidden banner's button owns nothing
    },
    showVenueCleared: (text) => {
      cleared.hidden = false;
      cleared.textContent = text;
    },
    showDescend: () => {
      descend.textContent = t(lang, 'overlay.descend');
      descend.hidden = false;
    },
    hideDescend: () => {
      descend.hidden = true;
    },
    showShardInterstitial: (which: 1 | 2 | 3 = 1) => {
      shardKey =
        which === 3
          ? 'overlay.shardInterstitial3'
          : which === 2
            ? 'overlay.shardInterstitial2'
            : 'overlay.shardInterstitial';
      shard.textContent = t(lang, shardKey);
      shard.hidden = false;
      window.clearTimeout(shardTimer);
      shardTimer = window.setTimeout(() => {
        shard.hidden = true;
      }, SHARD_INTERSTITIAL_MS);
    },
    showTierComplete: (stats) => {
      lastTierStats = stats;
      tierTitle.textContent = t(lang, tierTitleKey(stats.tier));
      tierStats.textContent = fill(t(lang, 'overlay.tierStats'), stats);
      // T4/T1 — the act close swaps the note line for the Act II tease (the
      // free-walk note belongs to the tier screens); setLang re-pins it.
      tierNote.textContent = t(lang, tierNoteKey(stats.tier));
      // T4/T1 — the act close dresses the same card in the carnival's rose
      // (index.html's `#mh-tier-box.act`); the tier screens keep the gold.
      tierBox.classList.toggle('act', stats.tier === 4);
      tier.hidden = false;
    },
    hideTier: () => {
      tier.hidden = true;
    },
    showFail: (reason) => {
      fail.hidden = false;
      fail.textContent = reason;
    },
    hideFail: () => {
      fail.hidden = true;
    },
    hint: (text) => {
      if (text === hintText) return; // per-frame calls stay off the DOM when idle
      hintText = text;
      hint.hidden = text === null;
      hint.textContent = text;
    },
    toast: (text) => {
      toast.textContent = text;
      toast.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.hidden = true;
      }, 2500);
    },
    setLang: (next) => {
      if (next === lang) return;
      lang = next;
      relabelStatic();
      renderChips();
      if (lastTierStats !== null && !tier.hidden) {
        tierTitle.textContent = t(lang, tierTitleKey(lastTierStats.tier));
        tierStats.textContent = fill(t(lang, 'overlay.tierStats'), lastTierStats);
        tierNote.textContent = t(lang, tierNoteKey(lastTierStats.tier)); // T4/T1 — the act tease flips too
      }
      if (!shard.hidden) shard.textContent = t(lang, shardKey); // T2/T5, T3/T1, T4/T1 — the live line
    },
    captionBar,
    root,
  };
}
