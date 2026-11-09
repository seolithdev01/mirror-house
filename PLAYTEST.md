# Playtest kit — five strangers and a mirror house

A 30-minute script for watching five people who have never seen the game play it. The goal is not bug-hunting (the suites do that) — it is answering *"can a stranger survive the first floor without us in the room?"*

## Setup

1. `npm install && npm run build && npm run preview` (or `npm run dev`) on whatever machine the player will use. Fullscreen the window (`F11`) — the HUD and mirrors read best edge to edge.
2. **Fresh profile.** Use the browser's guest mode or a fresh profile, or the previous player's save and bests will leak in. Clear the site data between players if you reuse one profile.
3. A fresh **IndexedDB** start boots floor 1 of a random base — that is what you want. Do **not** pre-set a seed for players 1–5 (see the Daily tip below for the group session).
4. Sit slightly behind and to the side. You can see the screen; the player must not see your face reacting.
5. Have this file's question list ready on your phone or paper — do not fill a screen with it.
6. Ask each player the same two opening words, nothing more: **"Walk around."** No demo, no controls explanation, no "you might want to…". Every question they ask is data.

## The script (per player, ~25 minutes)

| Phase | Clock | You do |
| --- | --- | --- |
| Silence | 0:00–3:00 | Say nothing. Note the timestamp of: first movement, first frost, first beacon captured, first question asked. |
| Nudge | only if stuck 3+ min | One sentence, in escalating order: "The button in the top right that says FAQ." Then stop talking. |
| Floor 1 | until cleared | Note where they die (if they do) and what killed them: Echo, Chhaya, collapse, or wandering. |
| Floors 2–3 | remainder | Let them descend. Note whether they open Aaina (`I`), switch views (`V`), or touch Settings (`⚙`) unprompted. |
| Interview | last 5 min | The questions below. Write answers verbatim — do not paraphrase yet. |

## What to watch

- **First 60 seconds** — do they move before reading anything? Do they find ❄ Frost on their own? The HUD's top-right column is the only chrome; if they scan past it, that is a finding, not their failure.
- **Where they die** — an Echo catch within the first 30 s means the spawn sightline showed glass early; repeated deaths in the same corridor mean the fog mechanic ("F closes the eye") did not land. A collapse death means nothing told them sprinting into glass is the sin.
- **What they ask** — every "how do I…" is a missing hint. The most expensive questions: "what am I supposed to do?", "why won't the door open?", "what kills me?", "is there a map?".
- **The dead giveaway of a good run** — they slow to a walk near glass without being told.

## Feedback questions (ask in this order)

1. In one sentence: what is this game about?
2. What did you think you were supposed to do first?
3. What was the most confusing moment in the first five minutes?
4. Did anything hurt your eyes or make you dizzy? (If yes: mention ⚙ → reduce flashing / text size — and note that they did not find it themselves.)
5. Which control felt wrong on your hand? Would you change a key? (Then show ⚙ → Controls if they did not find it.)
6. Would you play another ten floors right now? Why / why not?

## Daily-seed tip (group session)

After the five solo sessions, if you want one shared conversation: hand everyone the **same ★ Daily seed** (the button derives it from the date) and watch two screens side by side. Same house, different deaths — the fastest way to hear "oh, *that's* what the fog is for" out loud.

## After the session

File findings as issues at github.com/seolithdev01/mirror-house/issues with the seed code and the timestamp — a seed reproduces the exact floor they were on. Triage in three buckets: **can't-start** (first 60 s failures), **can't-advance** (beacon/door confusion), **won't-return** (question 6 answers).
