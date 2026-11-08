// SPDX-License-Identifier: Apache-2.0
export interface FaqEntry { q: string; a: string }

export const FAQ: readonly FaqEntry[] = [
  { q: 'What is Mirror House?', a: 'A 100-floor escape through a century-old palace of mirrors. Floors are 2–5 minute tactical puzzles: fog the glass, outthink what hunts you, reach the stair door. You start at the top — level 1 — and descend.' },
  { q: 'How do I move?', a: 'Three modes, all fully playable alone — switch with the buttons at top right. Keys: WASD + mouse look (hybrid). Keys only: arrows or Q/E turn. Mouse only: hold left button to walk toward the cursor, hold right to sprint.' },
  { q: 'Why do I see myself in the mirrors?', a: 'Because it is the point. Your reflection is you — coat and lantern are yours to configure (try ?look=teal-white in the URL). In later floors, the house will try to fake it.' },
  { q: 'What is a seed?', a: 'Every floor layout is generated deterministically from its seed code — the same seed always builds the same maze. Share a code and a friend walks your exact floor.' },
  { q: 'What is the Daily?', a: 'A seed derived from today\'s date — everyone on Earth gets the same floor each day. One a day keeps the streak alive.' },
  { q: 'What are the streak and best time?', a: 'Streak counts consecutive days you cleared a floor. Best time is your fastest clear of the current seed. Both live only on your device.' },
  { q: 'Where is my data stored?', a: 'On your device, in your browser\'s local storage. No accounts, no servers, no telemetry — nothing leaves your machine. Ever.' },
  { q: 'Who is the lantern voice?', a: 'Aaina — a shard of the palace\'s first true mirror. She guides, hints, and occasionally judges. She arrives with the next milestone.' },
  { q: 'What hunts me in later floors?', a: 'Echoes — hollow reflections of past guests — and four Sentinels: Chhaya who walks your past, Taal who moves on the beat, Gher who seals exits, Aavart who predicts. Not yet. They come with the mirrors.' },
  { q: 'Is it free? Is it open source?', a: 'Yes and yes: MIT-style freedom under Apache-2.0 for code, CC-BY 4.0 for art and words. The repo is public on GitHub.' },
  { q: 'Who made the music?', a: 'Nobody yet — it arrives soon, generated live in your browser: Indian classical-fusion, fully original, no samples.' },
  { q: 'I found a bug.', a: 'Thank you — please file it at github.com/seolithdev01/mirror-house/issues with your seed code; the layout reproduces itself.' },
];

export function buildFaqOverlay(): { root: HTMLElement; toggle(): void } {
  const root = document.createElement('div');
  root.id = 'mh-faq-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-faq-box';
  const h = document.createElement('h2');
  h.textContent = 'Mirror House — FAQ';
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
  close.textContent = '✕ Close (H)';
  close.addEventListener('click', () => { root.hidden = true; });
  box.appendChild(close);
  root.appendChild(box);
  root.addEventListener('click', (e) => { if (e.target === root) root.hidden = true; });
  document.body.appendChild(root);
  return { root, toggle: () => { root.hidden = !root.hidden; } };
}
