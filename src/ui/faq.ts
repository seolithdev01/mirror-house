// SPDX-License-Identifier: Apache-2.0
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
    q: 'How do I move?',
    a: 'Three modes, all fully playable alone — switch with the buttons at top right. Keys: WASD + mouse look (hybrid). Keys only: arrows or Q/E turn. Mouse only: hold left button to walk toward the cursor, hold right to sprint.',
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
    a: "On your device, in your browser's local storage. No accounts, no servers, no telemetry — nothing leaves your machine. Ever.",
  },
  {
    q: 'Who is the lantern voice?',
    a: "Aaina — a shard of the palace's first true mirror. She guides, hints, and occasionally judges. She arrives with the next milestone.",
  },
  {
    q: 'What hunts me?',
    a: 'Echoes — hollow reflections of past guests, blind to everything but clear glass — and four Sentinels: Chhaya who walks your past, Taal who moves on the beat, Gher who seals exits, Aavart who predicts. The Echoes and Chhaya already prowl the maze; the deeper Sentinels wake in later milestones.',
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
    a: 'You cannot outrun your own past — she replays your exact path, six seconds behind. Never retrace your steps: doubling back walks you straight into her. Keep the trail bending so the past cannot catch the present, and step through a True Mirror (Space) to be somewhere your path never went. If she touches you, the floor fails and re-arms.',
  },
  {
    q: 'Is it free? Is it open source?',
    a: 'Yes and yes: MIT-style freedom under Apache-2.0 for code, CC-BY 4.0 for art and words. The repo is public on GitHub.',
  },
  {
    q: 'Who made the music?',
    a: 'Nobody yet — it arrives soon, generated live in your browser: Indian classical-fusion, fully original, no samples.',
  },
  {
    q: 'I found a bug.',
    a: 'Thank you — please file it at github.com/seolithdev01/mirror-house/issues with your seed code; the layout reproduces itself.',
  },
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
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.appendChild(close);
  root.appendChild(box);
  root.addEventListener('click', (e) => {
    if (e.target === root) root.hidden = true;
  });
  document.body.appendChild(root);
  return {
    root,
    toggle: () => {
      root.hidden = !root.hidden;
    },
  };
}
