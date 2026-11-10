// SPDX-License-Identifier: Apache-2.0
//
// Aaina's dialogue panel (M3/T2) — the FAQ overlay's diegetic sister. Same
// createElement-only construction and styling, but docked beside the maze
// instead of a centered modal: she is the lantern in your hand, and the floor
// keeps running (movement, echoes, Chhaya — everything) while she talks.
// State machine: closed → open(tab: ask) → open(tab: hint)… → closed, derived
// from `root.hidden` + the `tab` value, exactly the FAQ overlay's shape plus
// one tab axis. Toggled by [I] (her own key since M5/T1) and the HUD 💬 button.
import type { HintKind } from '../game/aaina';
import { LORE } from '../game/aaina';
import { trapDialog } from './dialog';
import { FAQ } from './faq';
import { fill, t, type Lang } from './i18n';

export type AainaTab = 'ask' | 'hint' | 'lore';

/** Live Hint-tab state — main feeds this per frame while the panel is open. */
export interface AainaHintView {
  kind: HintKind;
  cost: number;
  shards: number;
  /** The purchased line once bought (and still the current situation); null → preview only. */
  revealedText: string | null;
}

export interface AainaInit {
  /** Buy the offered hint: main spends shards, banks meta, increments hintsUsed. */
  onBuyHint(): void;
}

export interface AainaOverlay {
  root: HTMLElement;
  /** closed→open(ask)…→closed — the [I]/HUD toggle. */
  toggle(): void;
  isOpen(): boolean;
  setTab(tab: AainaTab): void;
  updateHint(view: AainaHintView): void;
  updateLore(unlocked: number): void;
  /** M4/T6 — re-label the TAB buttons + close button. Her words stay English:
   *  the dialogue is content, not chrome (the content pipeline owns them). */
  setLang(lang: Lang): void;
  /** M5/T5 — the close hint names the LIVE aaina key (keyLabel(keyOf('aaina'))),
   *  pushed by main at boot and after every rebind; a remap never leaves the
   *  label naming a dead key. */
  setCloseKey(key: string): void;
}

/** How she names each situation in the preview line ("I can tell you about: …"). */
const KIND_LABEL: Record<HintKind, string> = {
  beacons: 'the beacons',
  exit: 'the open stair door',
  chase: 'the thing hunting you',
  taal: 'the one on the beat',
  taalSentinel: 'the Sentinel on his rounds',
  gherNear: 'the one who seals the roads',
  chhaya: 'your shadow, seconds behind',
  anger: "the house's temper",
  stuck: 'the way onward',
};

export function buildAainaOverlay(init: AainaInit): AainaOverlay {
  const root = document.createElement('div');
  root.id = 'mh-aaina-overlay';
  root.hidden = true;
  const box = document.createElement('div');
  box.id = 'mh-aaina-box';

  const h = document.createElement('h2');
  h.id = 'mh-aaina-title'; // M5/T6 — the dialog's accessible name
  h.textContent = 'Aaina — the lantern speaks';
  box.appendChild(h);

  // Tab row — the only navigation inside the panel.
  const tabs = document.createElement('div');
  tabs.id = 'mh-aaina-tabs';
  const panels: Record<AainaTab, HTMLElement> = {
    ask: document.createElement('div'),
    hint: document.createElement('div'),
    lore: document.createElement('div'),
  };
  const tabBtns: Record<AainaTab, HTMLButtonElement> = {
    ask: document.createElement('button'),
    hint: document.createElement('button'),
    lore: document.createElement('button'),
  };
  // M4/T6 — the three TAB labels are chrome (localized); her heading, the FAQ
  // verbatim, hint lines and lore are content and stay English.
  let lang: Lang = 'en';
  let closeKey = 'I'; // M5/T5 — the default binding until main pushes the live one
  const labels: Record<AainaTab, string> = { ask: 'Ask', hint: 'Hint', lore: 'Lore' };
  for (const tabId of ['ask', 'hint', 'lore'] as const) {
    panels[tabId].id = `mh-aaina-${tabId}`;
    panels[tabId].hidden = true;
    const b = tabBtns[tabId];
    b.type = 'button';
    b.id = `mh-aaina-tab-${tabId}`;
    b.textContent = labels[tabId];
    b.addEventListener('click', () => setTab(tabId));
    tabs.appendChild(b);
    box.appendChild(panels[tabId]);
  }
  box.insertBefore(tabs, panels.ask);

  // Ask — the FAQ verbatim: she is where the house explains itself.
  for (const { q, a } of FAQ) {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = q;
    const p = document.createElement('p');
    p.textContent = a;
    d.append(s, p);
    panels.ask.appendChild(d);
  }

  // Hint — the shop window. Preview names the KIND only until bought.
  const hintLine = document.createElement('p');
  hintLine.id = 'mh-aaina-hint-text';
  const buy = document.createElement('button');
  buy.type = 'button';
  buy.id = 'mh-aaina-buy';
  buy.addEventListener('click', () => init.onBuyHint());
  panels.hint.append(hintLine, buy);

  // Lore — locked memories ask for cleared floors, not shards.
  const loreCount = document.createElement('p');
  loreCount.id = 'mh-aaina-lore-count';
  const loreList = document.createElement('div');
  loreList.id = 'mh-aaina-lore-list';
  panels.lore.append(loreCount, loreList);

  const close = document.createElement('button');
  close.type = 'button';
  close.id = 'mh-aaina-close';
  close.addEventListener('click', () => {
    root.hidden = true;
  });
  box.appendChild(close);
  root.appendChild(box);
  document.body.appendChild(root);
  // M5/T6 — dialog semantics: role=dialog + aria-modal, Tab cycles inside the
  // docked panel (the floor keeps simulating underneath, by her design), and
  // Escape closes — same path as the ✕ and the [I] toggle.
  trapDialog(root, { labelledBy: 'mh-aaina-title', onEscape: () => (root.hidden = true) });

  function relabel(): void {
    for (const tabId of ['ask', 'hint', 'lore'] as const) {
      labels[tabId] = t(lang, `tab.${tabId}`);
      tabBtns[tabId].textContent = labels[tabId];
    }
    close.textContent = fill(t(lang, 'misc.close'), { key: closeKey });
    close.setAttribute('aria-label', t(lang, 'aria.close'));
  }
  relabel();

  let tab: AainaTab = 'ask';
  function setTab(next: AainaTab): void {
    tab = next;
    for (const t of ['ask', 'hint', 'lore'] as const) {
      panels[t].hidden = t !== tab;
      tabBtns[t].classList.toggle('active', t === tab);
    }
  }

  // Per-frame feed, memoized like hud.hint so an idle panel never touches the DOM.
  let lastLine = '';
  let lastBuy = '';
  function updateHint(view: AainaHintView): void {
    const line =
      view.revealedText !== null
        ? `“${view.revealedText}”`
        : `I can tell you about: ${KIND_LABEL[view.kind]} — cost ◆ ${view.cost}  ·  you hold ◆ ${view.shards}`;
    if (line !== lastLine) {
      lastLine = line;
      hintLine.textContent = line;
    }
    const buyState =
      view.revealedText !== null
        ? `told|${view.cost}`
        : `${view.cost}|${view.shards < view.cost ? '0' : '1'}`; // unaffordable → disabled
    if (buyState !== lastBuy) {
      lastBuy = buyState;
      buy.disabled = view.revealedText !== null || view.shards < view.cost;
      buy.textContent = view.revealedText !== null ? 'She has told you' : `Buy — ◆ ${view.cost}`;
    }
  }

  let lastLore = -1;
  function updateLore(unlocked: number): void {
    if (unlocked === lastLore) return;
    lastLore = unlocked;
    loreCount.textContent = `${unlocked} of ${LORE.length} memories`;
    loreList.replaceChildren();
    LORE.forEach((entry, i) => {
      const p = document.createElement('p');
      if (i < unlocked) {
        p.textContent = entry;
      } else {
        p.className = 'locked';
        p.textContent = '🔒 Clears floors to hear more';
      }
      loreList.appendChild(p);
    });
  }

  return {
    root,
    toggle: () => {
      if (root.hidden) {
        setTab('ask'); // opening always starts the conversation at Ask
        root.hidden = false;
      } else {
        root.hidden = true;
      }
    },
    isOpen: () => !root.hidden,
    setTab,
    updateHint,
    updateLore,
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
