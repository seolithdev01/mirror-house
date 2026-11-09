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
    'settings.captionsNote': 'Sound cues show as text, bottom-centre, two lines at a time.',
    // M5/T4 — the Performance section: the quality radio + its two-clock note
    'settings.performance': 'Performance',
    'settings.perf': 'Quality',
    'settings.perf_auto': 'Auto',
    'settings.perf_low': 'Low',
    'settings.perf_mid': 'Medium',
    'settings.perf_high': 'High',
    'settings.perfNote':
      'Sharpness applies at once; mirror detail applies on the next floor. Auto follows your frame rate.',
    // M5/T2 — the Controls section: the 15 rebindable actions
    'settings.controls': 'Controls',
    'settings.keyNote': 'Click a key to change it. Escape cancels.',
    'settings.pressKey': 'press a key…',
    'settings.keyConflict': 'Already bound to {action}',
    'settings.keyRefused': 'Arrows and Shift are hardwired — pick another key',
    'settings.resetKeys': 'Reset keys to defaults',
    'key.forward': 'Forward',
    'key.back': 'Back',
    'key.left': 'Strafe left',
    'key.right': 'Strafe right',
    'key.sprint': 'Sprint',
    'key.turnL': 'Turn left',
    'key.turnR': 'Turn right',
    'key.frost': 'Frost',
    'key.view': 'Cycle view',
    'key.aaina': 'Aaina',
    'key.push': 'Push door',
    'key.stepThrough': 'Step through',
    'key.faq': 'FAQ',
    'key.mute': 'Mute',
    'key.tactical': 'Tactical pause',
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
    // hint line prompts (M5/T2: the verb prompts name the LIVE bound key)
    'hint.step': '{key} — step through',
    'hint.push': '{key} — push',
    'hint.sealed': 'The stair door is sealed — frost the beacons ({n}/{total})',
    'hint.tactical': '{key} — tactical pause',
    'hint.tacticalMarks': 'Tactical — click toggles waypoints · Esc clears them',
    'hint.tacticalResume': 'Tactical pause — Esc resumes',
    // Aaina's tab labels (her content stays English)
    'tab.ask': 'Ask',
    'tab.hint': 'Hint',
    'tab.lore': 'Lore',
    // M5/T3 — caption bar lines (sound cues as text; ≤2 on screen at once).
    // Fail/descend/tier reuse the overlay strings — the same announcement.
    'caption.echoSense': 'The glass sees you — an Echo stirs',
    'caption.echoChase': 'An Echo gives chase',
    'caption.echoConfused': 'An Echo wanders, blinded',
    'caption.chhaya': 'Your shadow is {s}s behind',
    'caption.taal': "Taal's lantern flares — the house's temper rises",
    'caption.anger60': 'The house is angry — the mirrors hum',
    'caption.anger90': 'The house is furious — the mirrors tremble',
    'caption.cleared': 'Floor cleared — {s}',
    'caption.hint': "Aaina's hint is yours",
    'caption.audioStarted': 'The music begins',
    'caption.muted': 'Sound muted',
    'caption.unmuted': 'Sound on',
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
    'settings.captionsNote':
      'ध्वनि संकेत लिखे रूप में दिखते हैं — नीचे बीच में, एक साथ दो पंक्तियाँ।',
    // M5/T4 — प्रदर्शन अनुभाग: गुणवत्ता रेडियो + दो-घड़ी वाली टिप्पणी
    'settings.performance': 'गति और गुणवत्ता',
    'settings.perf': 'गुणवत्ता',
    'settings.perf_auto': 'स्वतः',
    'settings.perf_low': 'कम',
    'settings.perf_mid': 'मध्यम',
    'settings.perf_high': 'उच्च',
    'settings.perfNote':
      'स्पष्टता तुरंत लागू; दर्पणों का ब्योरा अगली मंज़िल पर। स्वतः आपके फ़्रेम दर के पीछे चलती है।',
    // M5/T2 — कंट्रोल्स अनुभाग: पुनर्बद्ध की जा सकने वाली 15 क्रियाएँ
    'settings.controls': 'कंट्रोल्स',
    'settings.keyNote': 'कुंजी बदलने के लिए उस पर क्लिक करें। रद्द करने के लिए Escape दबाएँ।',
    'settings.pressKey': 'कुंजी दबाएँ…',
    'settings.keyConflict': 'यह कुंजी पहले से {action} के लिए है',
    'settings.keyRefused': 'ऐरो और Shift सदा बद्ध रहते हैं — कोई और कुंजी दबाएँ',
    'settings.resetKeys': 'कुंजियाँ डिफ़ॉल्ट पर लाएँ',
    'key.forward': 'आगे बढ़ना',
    'key.back': 'पीछे जाना',
    'key.left': 'बाएँ सरकना',
    'key.right': 'दाएँ सरकना',
    'key.sprint': 'दौड़ना',
    'key.turnL': 'बाएँ मुड़ना',
    'key.turnR': 'दाएँ मुड़ना',
    'key.frost': 'जमाना',
    'key.view': 'दृश्य बदलना',
    'key.aaina': 'आईना',
    'key.push': 'दरवाज़ा धकेलना',
    'key.stepThrough': 'आईना पार करना',
    'key.faq': 'सहायता',
    'key.mute': 'मौन',
    'key.tactical': 'रणनीति विराम',
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
    // संकेत-पंक्ति (M5/T2: क्रिया-संकेत जीवंत बद्ध कुंजी का नाम लेते हैं)
    'hint.step': '{key} — पार करें',
    'hint.push': '{key} — धकेलें',
    'hint.sealed': 'सीढ़ी का दरवाज़ा बंद है — बीकन जमाइए ({n}/{total})',
    'hint.tactical': '{key} — रणनीति विराम',
    'hint.tacticalMarks': 'रणनीति — क्लिक वेपॉइंट बदलता है · Esc मिटाता है',
    'hint.tacticalResume': 'रणनीति विराम — Esc जारी रखें',
    // आईना के टैब (उनकी बातें अँग्रेज़ी में रहेंगी)
    'tab.ask': 'पूछें',
    'tab.hint': 'संकेत',
    'tab.lore': 'कथा',
    // M5/T3 — कैप्शन पट्टी की पंक्तियाँ (छोटी, स्वाभाविक हिंदी; नाम देवनागरी में)
    'caption.echoSense': 'काँच ने देख लिया — एक प्रतिध्वनि जागी',
    'caption.echoChase': 'प्रतिध्वनि पीछा करने लगी',
    'caption.echoConfused': 'प्रतिध्वनि अंधी होकर भटकने लगी',
    'caption.chhaya': 'आपकी छाया {s} सेकंड पीछे है',
    'caption.taal': 'ताल की लालटेन भड़की — घर का क्रोध बढ़ा',
    'caption.anger60': 'घर क्रोधित है — दर्पण गूँज रहे हैं',
    'caption.anger90': 'घर अधीर है — दर्पण काँप रहे हैं',
    'caption.cleared': 'मंज़िल {s} में पार',
    'caption.hint': 'आईना का संकेत मिल गया',
    'caption.audioStarted': 'संगीत शुरू हुआ',
    'caption.muted': 'ध्वनि मौन',
    'caption.unmuted': 'ध्वनि चालू',
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
