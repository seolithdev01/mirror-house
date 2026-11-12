# Mirror House — Tester Guide

Thank you for kicking the mirrors. This page is everything you need: a
5-minute smoke path, where the full manual suite lives, how to send feedback,
and the one convention (your personal seed) that makes your reports
reproducible without accounts or telemetry.

**Privacy, up front:** the game runs entirely in your browser and your data
stays on your device. Saves live in your browser's own storage, nothing is
uploaded, no analytics, no accounts. Feedback is sent only when you press a
button — you will always see the exact text first. (Details: the repo's
[PRIVACY.md](https://github.com/seolithdev01/mirror-house/blob/main/PRIVACY.md).)

## Quick start — your personal link

Each invited tester gets a personal base seed (e.g. `TESTIS`). Your link is
the game's URL plus that seed plus tester mode:

```
https://mirror-house.seolith.com/?seed=TESTIS&test=1
```

Open it, and within a few seconds you should see:

- the banner **"TESTER MODE — diagnostics unlocked for this session"** (once),
- the **TESTER chip** bottom-left: `TESTER · {fps} · TESTIS:1` — live frame
  rate and the current floor's seed.

No banner, no chip? The link lost its params — check the address bar still
says `?seed=…&test=1`. Everything about the URL parameters (including how to
reset tester mode with `?test=0`) is in [URL-PARAMS.md](URL-PARAMS.md).

### Why a personal seed?

The base seed fully determines every floor of the house — same seed, same
mazes, same mirror placement, same patrols. So `TESTIS:3` (your seed, floor 3)
is an _exact place_: when you report "the stair door didn't unlock on
TESTIS:3", anyone can stand in the same room. Personal seeds let us sort and
reproduce reports without accounts, telemetry, or anything leaving your
device. Please always test under your own seed unless we ask otherwise.

## The 5-minute smoke

The shortest path that touches every major system. Defaults assumed (keys are
rebindable in ⚙ → Controls; mouse-only play works too):

1. **Boot** your personal link. Banner + TESTER chip appear; the game starts
   on floor 1 (`TESTxx:1` on the chip). Note the fps on the chip — if it sits
   well under ~30 on your machine, tell us (and see ⚙ → Performance → Auto).
2. **Walk.** `W A S D` move, `Q`/`E` or the mouse turn, `Shift` sprint. The
   breath bar (top right) is your frost ammunition.
3. **Frost a beacon.** Stand close to a bluish mirror, face it, press `F`.
   Fogged/captured beacons tick the 🪞 counter; frost all of them and the
   gold stair door unlocks.
4. **Watch your back.** The caption/feed and your own delayed shadow
   (Chhaya) appear as you play; getting caught or cracking too many mirrors
   (sprint into glass) fails the run and restarts the floor — let it happen
   once on purpose.
5. **Clear floor 1.** Walk through the unlocked stair door; the game descends
   to floor 2 (`TESTxx:2` on the chip). Your progress saved — prove it by
   refreshing the page: it resumes on floor 2.
6. **Views.** Press `V` twice for the overhead map (fog of war, radar pings),
   `T` for the tactical pause (click cells to mark waypoints, `Esc` to
   resume).
7. **Panels.** Open `? FAQ` (`H`), `💬 Aaina` (`I` — buy one hint if you have
   ◆5), `⚙ Settings` (try text size + reduced flashing), the ⓘ About panel,
   and the 🌐 language button (English ↔ हिंदी).
8. **Send one report** — even "smoke passed, 60fps, nothing weird" via 📮
   (see below). That is the whole ask.

## The full manual suite

When you have 20–30 minutes, the complete checklist — 31 cases across
campaign flow, views, accessibility, saves, audio, the venue side-floor, and
mobile/touch — lives in [TEST-CASES.md](TEST-CASES.md). Work top to bottom or
cherry-pick; every case is steps + expected result.

## How to send feedback

Three doors, best first:

1. **📮 The in-game composer (top right).** Pick 🐞 Bug / 💡 Suggestion /
   💙 A kind word, write a line or two, and read what is pre-filled: the
   message already carries a diagnostics block — game version, your seed and
   floor, quality preset, language, accessibility flags, and any errors the
   session recorded — precisely so you never have to guess what info we need.
   Delete anything you would rather not share, then:
   - **Open GitHub issue** builds a fully prefilled issue (template, labels,
     your text + diagnostics) in
     [github.com/seolithdev01/mirror-house/issues](https://github.com/seolithdev01/mirror-house/issues)
     — needs a (free) GitHub account;
   - **Email instead** opens your mail client with the same body addressed to
     the support alias **itsupport01@seolith.com** — for testers without
     GitHub. Either way, nothing is sent until you press the button and see
     the final text.
2. **GitHub issues directly** — same place, minus the prefill.
3. **Reply to your invite** — fine for anything private; we will turn it into
   an issue on your behalf.

**What makes a report great:** the seed + floor from the TESTER chip
(`TESTIS:3`), what you did, what you expected, what happened, and whether it
happens every time. A screenshot or a screen recording is gold. The one thing
we can never debug from: "it broke" with no seed.

## FAQ for testers

- **Something feels off but you're not sure it's a bug?** Send it anyway —
  💡 Suggestion exists for exactly that; tuning is the beta's job.
- **Your save from an earlier session?** It lives in the browser you played
  in (per-site storage). Don't test on a browser you clean automatically,
  and ⚙/💾 can export the save to a file if you want a backup or to move
  between machines.
- **Audio** starts only after your first click/keypress (browser rule), and
  `M` mutes. The music is generated live, not recorded — tell us how the
  performance _feels_, that is part of what is being tested.
- **Done for the day?** Just close the tab. Tester mode dies with the
  session; your progress is saved on your device.
