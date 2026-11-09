// SPDX-License-Identifier: Apache-2.0
//
// M4/T6 — the en/hi string table. UI chrome only: HUD buttons and chips, the
// view label, the fail/clear/descend/tier overlays, the hint prompts, Aaina's
// TAB labels, the FAQ heading + close button. Aaina's dialogue, the FAQ
// entries and the lore are content, not chrome — they stay English (the
// content pipeline owns them). Hindi is authored, not machine-flipped: chip
// labels stay compact single-line (CHIP_KEYS caps hi at 40 chars, enforced by
// the parity test), verbs are imperatives (जमाइए/धकेलें/देखें), and the
// overlays stay in the house's voice but short.

export type Lang = 'en' | 'hi';

export const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    // input-mode buttons (top right)
    'mode.keyboard': '⌨ Keys',
    'mode.mouse': '🖱 Mouse',
    'mode.hybrid': '⌨+🖱 Both',
    // the view chip ([V] cycles)
    'view.focus': 'Focus',
    'view.quad': 'Quad',
    'view.overhead': 'Overhead',
    'view.tactical': 'Tactical',
    // HUD buttons
    'btn.frost': '❄ Frost',
    'btn.faq': '? FAQ',
    'btn.daily': '★ Daily',
    'btn.aaina': '💬 Aaina',
    'btn.mute': '🔊 Sound',
    'btn.muted': '🔇 Muted',
    'btn.export': 'Export save file',
    'btn.import': 'Import save file',
    // the 🌐 cycle button names the lang it switches TO
    'btn.langHi': '🌐 हिं',
    'btn.langEn': '🌐 EN',
    'btn.langTitle': 'Switch language / भाषा बदलें',
    // M5/T1 — the ⚙ settings overlay (Display + Access this milestone)
    'btn.settings': 'Settings',
    'settings.title': 'Settings',
    'settings.display': 'Display',
    'settings.textScale': 'Text size',
    'settings.access': 'Access',
    'settings.reducedFlash': 'Reduce flashing',
    'settings.reducedFlashNote': 'Steadies pulsing lights; overlays fade in and out.',
    'settings.captions': 'Captions for sound cues',
    'settings.captionsNote': 'Saved now — the caption bar arrives in a coming update.',
    'settings.close': '✕ Close',
    // chips (emoji + label + live value)
    'chip.streak': 'Streak',
    'chip.best': 'Best',
    'chip.timer': 'Timer',
    'chip.beacons': 'Beacons',
    'chip.shards': 'Shards',
    'chip.floor': 'L', // prefix: L01, L02…
    'chip.dwaar': 'DWAAR', // L10 · DWAAR I ✦
    // overlays and banners
    'overlay.failCaught': 'Caught by the glass',
    'overlay.failCollapse': 'The mirrors collapsed',
    'overlay.cleared': 'Floor cleared in {s} (best {best})',
    'overlay.clearedBest': '✨ Floor cleared in {s} — new best!',
    'overlay.descend': 'descending…',
    'overlay.tierTitle': '✦ Truth-Shard I claimed — Tier I complete',
    'overlay.tierStats': '{floors} floors cleared · {shards} shards banked',
    'overlay.tierNote': 'The shard is already banked — staying is a free walk.',
    // hint line prompts
    'hint.step': 'Space — step through',
    'hint.push': 'E — push',
    'hint.sealed': 'The stair door is sealed — frost the beacons ({n}/{total})',
    'hint.tactical': 'T — tactical pause',
    'hint.tacticalMarks': 'Tactical — click toggles waypoints · Esc clears them',
    'hint.tacticalResume': 'Tactical pause — Esc resumes',
    // Aaina's tab labels (her content stays English)
    'tab.ask': 'Ask',
    'tab.hint': 'Hint',
    'tab.lore': 'Lore',
    // misc chrome
    'misc.close': '✕ Close ({key})',
    'misc.playAgain': '↻ Play again',
    'misc.stay': 'Stay — wander the hall',
    'toast.exported': 'Save exported',
    'toast.rejected': 'Save file rejected',
    'faq.title': 'Mirror House — FAQ',
  },
  hi: {
    // इनपुट-मोड बटन
    'mode.keyboard': '⌨ कुंजियाँ',
    'mode.mouse': '🖱 माउस',
    'mode.hybrid': '⌨+🖱 दोनों',
    // दृश्य चिप ([V] से बदलती है)
    'view.focus': 'फोकस',
    'view.quad': 'चौक',
    'view.overhead': 'नक्शा',
    'view.tactical': 'रणनीति',
    // HUD बटन — क्रियाएँ आदेशार्थ हैं
    'btn.frost': '❄ जमाइए',
    'btn.faq': '? सहायता',
    'btn.daily': '★ दैनिक',
    'btn.aaina': '💬 आईना',
    'btn.mute': '🔊 ध्वनि',
    'btn.muted': '🔇 मौन',
    'btn.export': 'सेव फ़ाइल निर्यात करें',
    'btn.import': 'सेव फ़ाइल आयात करें',
    // 🌐 बटन उसी भाषा का नाम दिखाता है जिसमें जाना है
    'btn.langHi': '🌐 हिं',
    'btn.langEn': '🌐 EN',
    'btn.langTitle': 'Switch language / भाषा बदलें',
    // M5/T1 — ⚙ सेटिंग्स ओवरले (इस चरण में: प्रदर्शन + सुगम्यता)
    'btn.settings': 'सेटिंग्स',
    'settings.title': 'सेटिंग्स',
    'settings.display': 'प्रदर्शन',
    'settings.textScale': 'अक्षर आकार',
    'settings.access': 'सुगम्यता',
    'settings.reducedFlash': 'चमक कम करें',
    'settings.reducedFlashNote': 'स्पंदित रोशनी स्थिर होती है; परदे धीरे-धीरे आते-जाते हैं।',
    'settings.captions': 'ध्वनि संकेतों के कैप्शन',
    'settings.captionsNote': 'अभी सहेजा जाता है — कैप्शन पट्टी आगामी अपडेट में आएगी।',
    'settings.close': '✕ बंद करें',
    // चिपें — छोटे शब्द, एक ही पंक्ति
    'chip.streak': 'लय',
    'chip.best': 'सर्वश्रेष्ठ',
    'chip.timer': 'समय',
    'chip.beacons': 'बीकन',
    'chip.shards': 'शार्ड',
    'chip.floor': 'स्तर ', // उपसर्ग: स्तर 01, स्तर 02…
    'chip.dwaar': 'द्वार', // स्तर 10 · द्वार I ✦
    // परदे और पट्टियाँ — घर की आवाज़ में, पर संक्षेप में
    'overlay.failCaught': 'काँच ने आपको पकड़ लिया',
    'overlay.failCollapse': 'दर्पण ढह गए',
    'overlay.cleared': 'मंज़िल {s} में पार (सर्वश्रेष्ठ {best})',
    'overlay.clearedBest': '✨ मंज़िल {s} में पार — नया सर्वश्रेष्ठ!',
    'overlay.descend': 'नीचे उतर रहे हैं…',
    'overlay.tierTitle': '✦ सत्य-शार्ड प्राप्त — चरण I पूर्ण',
    'overlay.tierStats': '{floors} मंज़िलें पार · {shards} शार्ड जमा',
    'overlay.tierNote': 'शार्ड जमा हो चुका है — रुकना एक मुफ़्त सैर है।',
    // संकेत-पंक्ति
    'hint.step': 'Space — पार करें',
    'hint.push': 'E — धकेलें',
    'hint.sealed': 'सीढ़ी का दरवाज़ा बंद है — बीकन जमाइए ({n}/{total})',
    'hint.tactical': 'T — रणनीति विराम',
    'hint.tacticalMarks': 'रणनीति — क्लिक वेपॉइंट बदलता है · Esc मिटाता है',
    'hint.tacticalResume': 'रणनीति विराम — Esc जारी रखें',
    // आईना के टैब (उनकी बातें अँग्रेज़ी में रहेंगी)
    'tab.ask': 'पूछें',
    'tab.hint': 'संकेत',
    'tab.lore': 'कथा',
    // शेष क्रोम
    'misc.close': '✕ बंद करें ({key})',
    'misc.playAgain': '↻ फिर से खेलें',
    'misc.stay': 'रुकें — हॉल में घूमें',
    'toast.exported': 'सेव निर्यात हुआ',
    'toast.rejected': 'सेव फ़ाइल अस्वीकृत',
    'faq.title': 'मिरर हाउस — सहायता',
  },
};

/** Keys rendered as one-line chips/buttons: the hi values must stay compact
 *  (≤ 40 chars — the parity test enforces it) so the HUD never wraps. */
export const CHIP_KEYS: readonly string[] = [
  'mode.keyboard',
  'mode.mouse',
  'mode.hybrid',
  'view.focus',
  'view.quad',
  'view.overhead',
  'view.tactical',
  'btn.frost',
  'btn.faq',
  'btn.daily',
  'btn.aaina',
  'btn.mute',
  'btn.muted',
  'btn.langHi',
  'btn.langEn',
  'chip.streak',
  'chip.best',
  'chip.timer',
  'chip.beacons',
  'chip.shards',
  'chip.floor',
  'chip.dwaar',
  'tab.ask',
  'tab.hint',
  'tab.lore',
];

/** Boot resolution: `?lang=` beats the saved preference beats the browser's
 *  language, and anything unusable falls through to English. Exact codes only
 *  — `?lang=HINDI` is not a choice. */
export function resolveLang(
  saved: Lang | undefined,
  url: string | null,
  nav: string | undefined,
): Lang {
  if (url === 'en' || url === 'hi') return url; // 1. the URL names it (the demo path)
  if (saved === 'en' || saved === 'hi') return saved; // 2. the saved choice
  if (nav !== undefined && nav.toLowerCase().startsWith('hi')) return 'hi'; // 3. hi-* browser
  return 'en'; // 4. the floor
}

/** One chrome string. Missing hi falls back to en (parity makes it moot), and
 *  a key neither table knows returns itself — visible and greppable, never a
 *  blank chip. */
export function t(lang: Lang, key: string): string {
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}

/** Substitute `{token}` placeholders in a t() template (`{s}`, `{n}`, …). */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : token,
  );
}
