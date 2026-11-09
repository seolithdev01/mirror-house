// SPDX-License-Identifier: Apache-2.0
import { trapDialog } from './dialog';
import { fill, t, type Lang } from './i18n';

export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ: readonly FaqEntry[] = [
  {
    q: 'What is Mirror House?',
    a: 'A 100-floor escape through a century-old palace of mirrors. Floors are 2–5 minute tactical puzzles: fog the glass, outthink what hunts you, reach the stair door. You start at the top — level 1 — and descend.',
  },
  {
    q: 'How do the floors work — what am I descending?',
    a: "Ten floors make Tier 1. Clearing a floor turns its exit into the Stair Door: walk in, the house holds a breath behind a descending… banner, and the next floor arms — more Echoes, more beacons, a tighter maze, and Chhaya closer behind (7 s on floor 1, 4.6 s by floor 9). The floor chip in the HUD row — L01, L02… — says where you stand. Floor 5 belongs to Taal, the beat-walker: his touch adds 20 anger, once per second and a half, and never kills — a temper, not an executioner. Floor 10 is the Dwaar (L10 · DWAAR I ✦), Chhaya's fixed threshold hall — clear it to claim Truth-Shard I and finish the tier. Your floor is saved: close the tab mid-tier and you resume exactly where you stood.",
  },
  {
    q: 'How do I move?',
    a: 'Three modes, all fully playable alone — switch with the buttons at top right. Keys: WASD + mouse look (hybrid). Keys only: arrows or Q/E turn. Mouse only: hold left button to walk toward the cursor, hold right to sprint.',
  },
  {
    q: 'How do the views and the map work?',
    a: 'V cycles: Focus (first person) → Quad (front, left, right and back panes at once) → Overhead (a walking 2D map of everything you have explored) → back to Focus. From the Overhead map, T is the tactical pause: the floor freezes while you plan, a click marks a cell as a waypoint (up to eight), the first Esc clears your marks and the next Esc — or any V — returns you to your eyes with the route still drawn. The run clock keeps running while you plan: best times are pause-proof.',
  },
  {
    q: 'Why do I see myself in the mirrors?',
    a: 'Because it is the point. Your reflection is you — coat and lantern are yours to configure (try ?look=teal-white in the URL). In later floors, the house will try to fake it.',
  },
  {
    q: 'What is a seed?',
    a: 'Every floor layout is generated deterministically from its seed code — the same seed always builds the same maze. Share a code and a friend walks your exact floor.',
  },
  {
    q: 'What is the Daily?',
    a: "A seed derived from today's date — everyone on Earth gets the same floor each day. One a day keeps the streak alive.",
  },
  {
    q: 'What are the streak and best time?',
    a: 'Streak counts consecutive days you cleared a floor. Best time is your fastest clear of the current seed. Both live only on your device.',
  },
  {
    q: 'Where is my data stored?',
    a: "On your device, in your browser's IndexedDB — one record holding your look, your settings, your language, shards, streak, best times and your floor in the campaign. No accounts, no servers, no telemetry — nothing leaves your machine. Ever.",
  },
  {
    q: 'What do the 💾 and 📂 buttons do?',
    a: 'They carry your save. 💾 exports the whole record as readable JSON — mirror-house-save.json — to keep as a backup or move to another device. 📂 imports one back: the file is validated field by field before anything is stored, and a wrong or tampered file is rejected — "Save file rejected" — never executed. Importing reloads the game onto the restored save.',
  },
  {
    q: 'Who is the lantern voice?',
    a: "Aaina — a shard of the palace's first true mirror, docked beside the maze when you press I. She guides, hints, and occasionally judges. Her hints cost shards; her Lore tab costs cleared floors.",
  },
  {
    q: 'What does Aaina sell — and what do hints cost?',
    a: 'Open her panel with I (or the 💬 button) and pick the Hint tab. Hints are priced in shards: ◆5 for the first on a floor, ◆10 for the second, ◆15 after that — the price resets on a new floor. Only banked shards (the 💠 chip) can pay, never the pending ones riding the current floor. She names her subject before you buy (the beacons, the open stair door, the thing hunting you…) and will not repeat herself until the situation changes.',
  },
  {
    q: 'What hunts me?',
    a: 'Echoes — hollow reflections of past guests, blind to everything but clear glass — and four Sentinels: Chhaya who walks your past, Taal who moves on the beat, Gher who seals exits, Aavart who predicts. The Echoes and Chhaya prowl from floor 1; Taal keeps the beat on floor 5; the deeper Sentinels wake in later milestones.',
  },
  {
    q: 'How do I fog mirrors — and why bother?',
    a: "Face the glass and press F: the Frost Lantern breathes on it, and the reflection fogs over for 25 seconds. Each breath spends about a third of your lantern's air, which refills in four seconds. Fogged mirrors are blind — the Echoes see you only through clear glass — and enough frosted eyes in one place will confuse an Echo into a spinning standstill. Fog is the only attack you get.",
  },
  {
    q: 'What makes the house angry?',
    a: 'Sprinting into mirrors. Every crack adds 15 anger — once per pane — and at 100 the mirrors collapse and the floor is lost, pending shards and all. Walking never cracks anything, so when glass is close, arrive at a walk. A failed floor re-arms itself at once; the house forgets nothing but lets you try again.',
  },
  {
    q: "Why won't the stair door open?",
    a: 'It is sealed until every beacon mirror is captured. Beacons — the 🪞 panes the counter at the bottom right tallies — frost permanently instead of for 25 seconds: one breath each captures it and banks five shards. When the last one frosts over, the door turns gold and the stairs are yours.',
  },
  {
    q: 'How do I shake Chhaya?',
    a: 'You cannot outrun your own past — she replays your exact path, seconds behind, and quicker the deeper you go. Never retrace your steps: doubling back walks you straight into her. Keep the trail bending so the past cannot catch the present, and step through a True Mirror (Space) to be somewhere your path never went. If she touches you, the floor fails and re-arms.',
  },
  {
    q: 'Is it free? Is it open source?',
    a: 'Yes and yes: MIT-style freedom under Apache-2.0 for code, CC-BY 4.0 for art and words. The repo is public on GitHub.',
  },
  {
    q: 'Who made the music?',
    a: 'Nobody — it is generated live in your browser: raga-inspired classical-fusion, fully original, no samples. It begins with your first input and follows the house, sharpening as anger and pursuit climb. M or the 🔊 button mutes it, and the choice is remembered.',
  },
  {
    q: 'Can I install it? Does it work offline? What languages?',
    a: 'Yes on all three. On the published build, your browser’s Install app / Add to Home Screen action gives Mirror House its own window and icon, and a service worker keeps a copy of the game — installed once, it loads and plays with the network off. The HUD speaks English and Hindi: the 🌐 button cycles between them (or ?lang=hi in the URL) and your choice is remembered. Aaina’s dialogue and these answers stay English for now — the content pipeline owns them.',
  },
  {
    q: 'What are captions — and where do I turn them on?',
    a: 'Captions write the house’s sound cues as text, the way subtitles carry speech. The bar at the bottom-centre of the screen shows the latest two lines for a few seconds each: an Echo stirring in the glass, giving chase, or wandering blinded by your frost; your shadow’s first appearance on a floor (and exactly how many seconds behind you she walks — 7 on floor 1, tightening to 4 in the Dwaar); Taal’s lantern flaring when his touch lands; the house’s anger at 60 and at 90; fails, clears, descents and the tier; Aaina’s hints; and the music starting or muting. Turn them on in ⚙ Settings → Access — “Captions for sound cues”. The choice is saved with everything else, the text follows the Text size setting, and in Hindi play the lines are Hindi.',
  },
  {
    q: 'What can I change in ⚙ Settings?',
    a: 'Everything personal, in four sections. Display: text size for the whole HUD — 100, 125 or 150%. Access: Reduce flashing (every pulsing light steadies and overlays fade instead of popping) and Captions for sound cues. Performance: Auto follows your frame rate, or lock Low/Medium/High — sharpness applies at once, mirror detail on the next floor. Controls: remap all 15 actions — click a row, press a key; the conflict guard refuses a key another action already owns, arrows and Shift stay hardwired as movement alternates, and Reset restores the defaults. Every change applies immediately and is saved on your device. The full accessibility statement — modes, entity identity, the reduced-flash audit — is docs/A11Y.md in the repository.',
  },
  {
    q: 'What is a sponsored floor — the ☕ Glasshouse Café in ⚙ → Floors?',
    a: 'A side-excursion, not an ad. Local ventures can commission a floor themed to their space (a café, a studio, a shop) — built from a strict pack: their name, a one-line tagline in English and Hindi, two accent colours, and their own maze shape. Play it from ⚙ Settings → Floors; the banner says so up front, and the isolation is total: a sponsored floor never touches your campaign, your shards, or your best times, runs on its own daily seed, and the demo (the Glasshouse Café — a fictional café, clearly labelled) shows exactly what one looks like. Aaina does not follow you there — her hints are campaign knowledge, so the Buy button refuses on a sponsored floor and asks you to come back. During the beta, venue floors are free to the ventures that host them.',
  },
  {
    q: 'What is the privacy policy?',
    a: 'Short version: there is almost nothing to say — no accounts, no cookies, no analytics, no telemetry, and the game never sends anything anywhere. One IndexedDB record inside your own browser holds your look, your settings, your language, shards, streak, best times and your floor in the campaign. The 💾 export file contains that gameplay data and nothing else, because no personal data exists to export. The long version — storage, the export file’s exact contents, the content security policy — is PRIVACY.md in the repository; PROVENANCE.md lists where every byte of code, art and audio comes from.',
  },
  {
    q: 'I found a bug.',
    a: 'Thank you — please file it at github.com/seolithdev01/mirror-house/issues with your seed code; the layout reproduces itself.',
  },
];

export function buildFaqOverlay(): {
  root: HTMLElement;
  toggle(): void;
  setLang(lang: Lang): void;
  /** M5/T5 — the close hint names the LIVE faq key (keyLabel(keyOf('faq'))),
   *  pushed by main at boot and after every rebind; a remap never leaves the
   *  button naming a dead key. */
  setCloseKey(key: string): void;
} {
  // M4/T6 — the heading and the close button are chrome (localized); the 25
  // entries are content and stay English (the content pipeline owns them).
  let lang: Lang = 'en';
  let closeKey = 'H'; // the default binding until main pushes the live one
  const root = document.createElement('div');
  root.id = 'mh-faq-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-faq-box';
  const h = document.createElement('h2');
  h.id = 'mh-faq-title'; // M5/T6 — the dialog's accessible name
  box.appendChild(h);
  for (const { q, a } of FAQ) {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = q;
    const p = document.createElement('p');
    p.textContent = a;
    d.append(s, p);
    box.appendChild(d);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.appendChild(close);
  root.appendChild(box);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.hidden = true;
  });
  document.body.appendChild(root);
  // M5/T6 — dialog semantics: role=dialog + aria-modal, Tab cycles inside,
  // Escape closes (same path as the ✕: hidden flips, the trap restores focus).
  trapDialog(root, { labelledBy: 'mh-faq-title', onEscape: () => (root.hidden = true) });
  function relabel(): void {
    h.textContent = t(lang, 'faq.title');
    close.textContent = fill(t(lang, 'misc.close'), { key: closeKey });
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
    setCloseKey: (key) => {
      if (key === closeKey) return;
      closeKey = key;
      close.textContent = fill(t(lang, 'misc.close'), { key: closeKey });
    },
  };
}
