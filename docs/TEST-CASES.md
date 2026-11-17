# Mirror House — Manual Test Suite

The full beta checklist: 40 cases across smoke, campaign, views,
accessibility, saves, audio, the venue side-floor, the panes, mobile/touch,
and the session (the front door & the pause). The
[5-minute smoke](TESTERS.md) alone is enough to start — this page is for the
20–30 minute pass. Work top to bottom or cherry-pick by section; every case
is steps + expected result.

**Ground rules**

- Play your personal link unless a case says otherwise:
  `https://mirror-house.seolith.com/?seed=TESTXX&test=1` (yours is in your
  invite). The TESTER chip (bottom-left) should read
  `TESTER · {fps} · TESTXX:1` — that chip's value goes in every report.
- Defaults assumed: keys are rebindable in ⚙ → Controls, and the whole loop
  is playable mouse-only (🖱 mode) — if you test another way, say so.
- Everything here is black-box: play the deployed game like a player. No
  case needs the keyboard shortcut you don't have; every verb has a button.
- A case **passes** when every expected line holds. Anything else is a 🐞 —
  send it via 📮 (it auto-attaches diagnostics) or
  [repo issues](https://github.com/seolithdev01/mirror-house/issues), with
  the case ID and your chip's `SEED:FLOOR`.

## 1. Smoke — the six-step loop [SMK]

### SMK-1 — Boot the personal link

**Steps:** Open your personal link
(`https://mirror-house.seolith.com/?seed=TESTXX&test=1`) in a normal
browser tab. Watch for the one-time banner, then the chip bottom-left; note
the chip's fps number for a few seconds. In a second tab, open the plain URL
`https://mirror-house.seolith.com` with no parameters.

**Expected:** The banner "TESTER MODE — diagnostics unlocked for this
session" appears once and hides itself within ~6 s. The chip reads
`TESTER · {fps} · TESTXX:1` and the fps stays near your screen's rate (tell
us if it sits well under 30). The plain URL shows neither banner nor chip,
and fps under load is not erratic.

### SMK-2 — Walk, turn, sprint

**Steps:** In hybrid mode (default), click the view once to capture the
pointer, then walk with `W A S D`, turn with the mouse (or `Q`/`E`), sprint
with `Shift`. Bring up the breath bar (top right) by pressing `F` at any
mirror. Switch to ⌨ Keys and to 🖱 Mouse with the top-right buttons and walk
a corridor in each.

**Expected:** Movement is smooth with no snags on corners; turning feels
the same by mouse and keys; sprint is visibly faster. The breath bar drops
about a third per frost and refills in ~4 s. All three input modes walk and
turn; the active mode button stays highlighted.

### SMK-3 — Frost a beacon

**Steps:** Find a beacon mirror (bluish pane, tallied by the 🪞 chip). Stand
close, face it, press `F` (or the ❄ Frost button). Watch the 🪞 chip, the
mirror, and your reflection in it. Press `F` at plain glass too, and press
`F` again at the already-frosted beacon.

**Expected:** The pane fogs over and its reflection dies; the 🪞 chip ticks
toward its total; the beacon stays frosted. A frosted beacon re-press buys
nothing (no breath spent, counter unchanged). Plain glass fogs too but does
not tick the counter.

### SMK-4 — Fail a floor on purpose

**Steps:** Two ways, try both across attempts: (a) sprint face-first into
mirrors until the house collapses; (b) stand around until an Echo catches
you. After the fail screen, walk again and check the floor's mirrors, the
🪞 counter, and your shard count.

**Expected:** A fail overlay names it — "The mirrors collapsed" or "Caught
by the glass" — then the floor restarts: mirrors unfrost and un-crack, the
🪞 counter resets, the stair door re-seals. Your banked shards and past
floors survive; nothing about the fail reaches your save's progress.

### SMK-5 — Clear floor 1 and descend

**Steps:** Frost every beacon on floor 1 (🪞 n/n). Watch the stair door's
colour, then walk through it. Wait through the brief banner; check the
floor chip in the HUD's chip row and the TESTER chip's seed value.

**Expected:** The last beacon turns the sealed door gold; walking in shows
the "descending…" banner; the game resumes on floor 2 — floor chip `L02`,
TESTER chip `TESTXX:2`. The clear line shows your time and best.

### SMK-6 — Save and resume

**Steps:** Immediately after SMK-5, refresh the page (same personal link).
Check the floor chip and TESTER chip, then reopen the plain URL
(`https://mirror-house.seolith.com`, no params) in a new tab.

**Expected:** The refresh resumes floor 2, not floor 1 — same position in
the house, banked shards intact. The plain URL resumes the same saved
campaign (your saved floors), with no TESTER chip since the param is gone.

## 2. Campaign — the ten-floor tier [CMP]

### CMP-1 — The sealed stair door

**Steps:** On a fresh floor, find the stair door before frosting anything
(it burns dim red while sealed). Walk into it and try to pass; read the hint
line. Frost all beacons but one, approach again; then frost the last one
and approach once more.

**Expected:** While beacons remain, the door stays sealed and the hint
reads "The stair door is sealed — frost the beacons (n/total)" with the
live count. Only at n/total does it turn gold and let you through.

### CMP-2 — Shards and the beacon economy

**Steps:** Frost beacons across a floor and watch the 💠 chip as you go.
Clear the floor (shards bank at clear), then start the next. Open 💬 Aaina
(`I`) and check the price of a hint before and after buying one.

**Expected:** The 💠 chip shows banked shards plus pending ones in
parentheses while the floor is live; pending become banked only when the
floor clears. A first hint costs ◆ 5, the next ◆ 5 more (5, 10, 15…), and
the Buy button is disabled when the purse can't cover it.

### CMP-3 — Breath, the frost budget

**Steps:** Frost twice quickly back-to-back and watch the top-right breath
bar; try a third frost immediately. Wait for the refill and try again. Also
click the ❄ Frost button repeatedly with the bar near empty.

**Expected:** Each frost spends about a third of the lantern; two quick
breathes leave too little for a third until it refills (~4 s). The ❄ button
disables while breath is short — no click-spam losses. Refill is steady,
not chunky.

### CMP-4 — Echoes: sense, chase, blind

**Steps:** Let an Echo see you through clear glass; watch the caption feed
(top-centre) and its behaviour. Break line-of-sight with honest stone, then
deliberately let one watch you through a pane and frost that pane. Repeat
with several panes around one Echo.

**Expected:** "The glass sees you — an Echo stirs", then "An Echo gives
chase" as it pursues; frost the pane it watches through and it stalls —
"An Echo wanders, blinded", spinning slowly. Fog enough eyes around one
and it stays confused. It never walks through walls.

### CMP-5 — Chhaya, your delayed shadow

**Steps:** Early in a floor, walk a long loop and watch your back. Note the
caption when she first appears. Then retrace your exact path; finally step
through a True Mirror (`Space` where offered) or bend your trail somewhere
you have never walked.

**Expected:** The near-black figure with the rose lantern follows your
exact recorded path, seconds behind (the caption says how many), and only
ever walks where you walked. Retracing meets her; a bent trail or a
step-through loses her.

### CMP-6 — Taal on floor 5

**Steps:** Descend to floor 5 (resume a save there if you have one). Find
the gold-lantern figure; watch his stride against the music's beat. Let him
touch you once; read the caption and the house's temper (mirror hum).
Cross him again in the rest between accents.

**Expected:** Taal lurches on the beat — a surge on accents, a crawl
between — and his touch never kills: the caption reads "Taal's lantern
flares — the house's temper rises" and the house's anger rises, but the
floor stays yours. He keeps the beat even while muted.

### CMP-7 — The Dwaar and the tier's end

**Steps:** Reach floor 10 (resume helps). Check the floor chip and the
hall's character versus procedural floors. Clear it, read the tier screen,
and press ↻ Play again; on the fresh base, open ⚙ → About or the chips to
confirm where you stand.

**Expected:** Floor chip reads `L10 · DWAAR I ✦` in a fixed hand-authored
hall. Clearing claims "✦ Truth-Shard I" with a floors/shards tally, then
↻ Play again starts a fresh random base at floor 1 (Stay leaves you free
in the hall). The old tier's shards stay banked.

### CMP-8 — Timer, bests, day streak

**Steps:** Clear two floors at a leisurely pace, noting the ⏳ timer on
each; then redo a cleared floor fast (Play again or a later resume). After
any clear, check ⏱ Best and 🔥 Streak; come back another day and clear one
floor.

**Expected:** ⏳ times each floor; the first clear banks a ⏱ best per
floor (✨ marks a new best); beating it lowers the number. 🔥 counts
consecutive days with a cleared floor — it holds its number when you
return the next day and clear one.

## 3. Views [VW]

### VW-1 — The V cycle: Focus → Quad → Overhead

**Steps:** On any floor, press `V` once, twice, three times, watching the
👁 chip in the HUD's chip row each time. In Quad, check all four panes
render (one per wall). In Overhead, walk a corridor and return to Focus.

**Expected:** `V` cycles Focus (first person) → Quad (four panes at once)
→ Overhead (walking 2D map) → Focus, and the 👁 chip names each mode as it
lands. All three render correctly with no flicker on the switch.

### VW-2 — Overhead: fog of war and radar

**Steps:** Switch to Overhead (two `V` presses). Walk into unexplored
corridors; stir an Echo and let Chhaya trail you while you watch the map.
Note the marks: your arrow, rings, fading dots, the door and beacons.

**Expected:** The map reveals only where you have walked (fog of war);
Echo sense/chase pings land as small fading red dots; Chhaya shows as a
pale hollow ring on your past path; you are the gold arrow; beacons and
the stair door are marked. The whole floor is playable from this view.

### VW-3 — Tactical pause and waypoints

**Steps:** Press `T`. Try to walk (any movement key) while paused; click
empty cells to drop waypoints, click one again to remove it, drop more
than eight. Press `Esc`, move, and press `T` again mid-chase.

**Expected:** `T` freezes the floor (the 👁 chip says Tactical; the hint
line explains Esc). Movement inputs do nothing while paused. Clicks toggle
waypoint marks, capped at eight; `Esc` clears them and resumes the exact
live game — an Echo mid-chase resumes mid-chase.

## 4. Accessibility [A11Y]

### A11Y-1 — Text size

**Steps:** Open ⚙ Settings (gear button, top right) → Display → Text size;
try 100%, 125%, 150%. While scaled up, read the chips, a caption line, an
overlay (FAQ), and the hint line. Refresh the page at 150%.

**Expected:** Every text surface — chips, buttons, overlays, captions,
hints — scales at once; nothing clips or overlaps at 150%. The choice
survives the refresh (it is saved on your device).

### A11Y-2 — Reduce flashing

**Steps:** ⚙ → Access → turn on "Reduce flashing". Open and close the FAQ,
settings, and the 📮 composer; trigger a fail overlay and a clear. On floor
5, watch Taal's lantern for several beats with it off, then on.

**Expected:** Overlays and banners fade in and out (~0.3 s) instead of
popping. With the toggle on, Taal's lantern holds one steady glow while
his stride keeps its rhythm — the beat survives in motion, not light.

### A11Y-3 — Captions for sound cues

**Steps:** ⚙ → Access → turn on "Captions for sound cues". Play one floor
loudly: stir and blind an Echo, meet Chhaya, anger the house past hum and
tremble, mute and unmute, buy a hint. Watch the bottom-centre bar.

**Expected:** Each cue prints as a line ("The glass sees you — an Echo
stirs", "Sound muted", …) in the HUD's language, at most two lines on
screen, each fading after ~4 s; repeats collapse to one line.

### A11Y-4 — Remap every key

**Steps:** ⚙ → Controls. Rebind Frost from `F` to `R`; try to bind `R`
elsewhere twice (conflict), try binding an arrow key, then rebind turn-right
away from `E` and back. Press your new frost key in-game; note the hint
lines; press "Reset keys to defaults".

**Expected:** Rebinding applies live — the next press of `R` frosts and
hint prompts name the live key. A owned key is refused with "Already bound
to {action}"; arrows/Shift are refused as hardwired alternates. Reset
restores the defaults everywhere at once.

### A11Y-5 — Dialogs, focus, and names

**Steps:** Open each overlay — ? FAQ (`H`), 💬 Aaina (`I`), ⚙, ⓘ, 📮 — and
press `Tab` repeatedly, then `Esc`. With a screen reader (or the
accessibility tree), inspect the icon-only buttons (🔊, 💾, 📂, 🌐, ⓘ, 📮,
❄). Boot `?seed=TESTXX&test=1&lang=hi`, then flip 🌐 back and forth.

**Expected:** `Tab` cycles inside each dialog and never escapes to the
page; `Esc` closes and focus returns to where you were. Every icon button
carries a readable label; overlays announce as dialogs. The `lang=hi` boot
starts the whole chrome in Hindi (it becomes your saved language), and 🌐
flips every chrome string (and the page's language) en ↔ hi with no
leftovers.

## 5. Saves [SAV]

### SAV-1 — Close the tab mid-tier

**Steps:** Clear two floors, then kill the tab entirely (no logout, no
URL tricks). Reopen the plain URL `https://mirror-house.seolith.com` in
the same browser. Check the floor chip, TESTER chip (absent), and shards.

**Expected:** The game resumes your campaign on the floor you left with
banked shards intact — not floor 1, not a new house. No TESTER chip
without the param; adding your personal link back resumes the same
campaign (the seed only names a house; the save owns your progress).

### SAV-2 — Export and import

**Steps:** Press 💾 (top right) and keep the file it writes. Play one more
floor. Press 🌂 and import that file. Then feed 📂 a random non-save file
(a renamed .txt) and watch for the notice.

**Expected:** 💾 downloads a save file; importing it restores the exact
position you exported (the extra floor's progress gone — the file wins).
The junk file is refused with a "Save file rejected" toast and the current
save is untouched.

### SAV-3 — Nothing leaves the device

**Steps:** Play a floor in your usual browser. Open the site in a private
window or a second browser on the same machine; also check what the site
requests with your browser's devtools network tab open for a minute of
play (optional but gold).

**Expected:** The private window starts fresh — no floors, no shards; the
two stores never mix. Beyond the game's own files, the network tab shows
no analytics, no accounts, no uploads: saves live in that browser's
storage only.

## 6. Audio [AUD]

### AUD-1 — The first gesture and the live score

**Steps:** Boot a fresh tab and make no input; then click once. Listen
through a calm walk, an Echo chase, and a fail. Mute, then unmute.

**Expected:** Silence until the first click/keypress — then "the music
begins" (caption, if captions are on). The score is generated live and its
intensity follows the action — chase raises it, calm settles it. Tell us
how the performance feels; that is part of what is being tested.

### AUD-2 — Mute

**Steps:** Press `M` (or the 🔊 button) during play; refresh the page.
Press `M` (or 🔇) again.

**Expected:** The button flips 🔊 → 🔇 and everything goes silent; the
caption reads "Sound muted" with captions on. The choice persists across
the refresh (boots muted). Unmuting restores full audio, and Taal's beat
was never dependent on sound anyway.

## 7. Venue — the side-floor [VEN]

### VEN-1 — Glasshouse Café via ⚙ → Floors

**Steps:** ⚙ → Floors → "☕ Glasshouse Café — DEMO" → ▶ Play demo floor.
Read the banner; play the floor (frost its beacons, clear it). Use ↩
Return to campaign (banner button or ⚙ → Floors again) and check your
campaign floor, shards, and bests.

**Expected:** The café banner names the pack and its daily seed; the
TESTER chip shows that daily seed, not your base. Clearing banks nothing —
no shards, no bests, "Floor cleared — return via ⚙". Returning restarts
your campaign floor at the same floor number, fresh (the banner warns
you); the campaign, banked shards, and bests are untouched.

### VEN-2 — The venue URL param

**Steps:** Open
`https://mirror-house.seolith.com/?seed=TESTXX&test=1&venue=demo-glasshouse-cafe`.
Then try `?venue=not-a-pack` the same way.

**Expected:** The first boots the café floor directly — banner up, daily
seed on the chip, campaign untouched. The bogus id falls back quietly to
your campaign floor (no error screen, no broken boot).

## 8. Mobile / touch [MOB]

**Note:** After any touch-input change, run MOB-1 and MOB-3 once on a real
phone — emulation bypasses the browser's gesture recognition (pull-to-refresh,
pinch-zoom, double-tap zoom), the exact failure class the gesture hardening
(touch-action/overscroll) and the HUD-tap zone guard exist for.

### MOB-1 — The whole loop on a touchscreen

**Steps:** On a phone or tablet, open your personal link — since T12 it
boots the 👆 TOUCH mode by itself (a pre-T12 save keeps whatever mode it
stored; switch with the dock's mode row). Drag on the left of the screen
to walk, steering and pacing with the stick; frost beacons with the dock's
❄ button; buy a hint; clear the floor.

**Expected:** Touch-hold walks toward the touch point; steering follows
the finger; the loop — walk, frost, descend — completes with no keyboard
at all. Buttons fire on tap; the breath bar still gates the ❄ button.

### MOB-2 — Small screens and rotations

**Steps:** Play on a phone in portrait, then rotate to landscape and back.
Open ⚙, 💬 Aaina, ? FAQ, and 📮; type a report; send it via "Email
instead". Check the chips and the caption bar in both orientations.

**Expected:** The HUD reflows — chips wrap, buttons stay tappable, the
caption bar stays readable; no fixed-width overflow, no pointer capture
asked. The composer types, the mailto hand-off works on mobile, and the
venue floor (⚙ → Floors) plays the same as desktop.

### MOB-3 — The touch stick walks and the right drag looks (T12)

**Steps:** On a phone (or a desktop browser's touch emulation), load any
floor in the TOUCH mode. Put a thumb down on the **left** of the screen
and drag upward, hold a beat, then lift. Then put a thumb down on the
**right** side and sweep it ~200 px sideways; lift. Watch your position
and your heading both times.

**Expected:** The stick drag walks — a virtual stick ring appears under
the thumb's down-point with a nub riding the drag, the farther the push
the faster the walk (to the rim: sprint-speed). Lifting the stick stops
you within a step — no coasting drift. The right-side sweep turns your
view with the drag (about 0.26° per pixel — a 200 px sweep turns ~51°)
and moves your body not at all — look turns, it never walks. A mouse pointer never summons the
stick; only real touch pointers drive the zones.

### MOB-4 — The compact screen de-clutters; the dock chips summon (T12)

**Steps:** On a phone-width screen (≤900 px, or any coarse-pointer
device), load a floor. Look for the keys bar, the minimap and the motion
pane; then tap the dock's **MAP** chip and the **MOTION** chip, and tap
each again. Resize a desktop window down past 900 px and back.

**Expected:** The compact layout is on (`body.compact`): the keys bar is
hidden — there are no keys on a phone — and both guide panes boot HIDDEN.
The MAP/MOTION chips summon the minimap and the motion pane as overlays
(the chip's pressed state matches), and a second tap sends them away.
Back on a wide fine-pointer desktop the shipped layout returns: keys bar
and panes visible as always. Pane visibility is a session preference —
it is never written to the save.

### MOB-5 — The frost dock button captures like the `F` key (T12)

**Steps:** On the phone layout, stand ~1 m in front of a 🪞 beacon's
glass with the lantern's breath affording a frost (the bar above the
dock is full), and tap the dock's **❄ Frost** button. Repeat with the
breath still recharging, and once with no mirror in view.

**Expected:** The tap fogs/captures exactly like pressing `F`: a beacon
in the 60° cone captures permanently (the 🪞 counter ticks up, the exit
door counts it), the breath spends ~a third of the bar, and a frost with
the bar short or no mirror faced does nothing harmful — the verb just
stands down. Every dock button works by tap alone; nothing on the
compact HUD needs a keyboard.

### MOB-6 — The device picks the starting controls; the first input locks (T12b)

**Steps:** With a fresh save (a private window, or clear the site's
storage first), open the game on a phone or any touchscreen — check the
mode chip at the top right. Open it the same way on a plain desktop and
check the chip again. On the desktop, press a key (`W`) once and reload;
on the phone, tap the screen once and reload. Then switch modes from the
mode row (or ⚙) and reload once more.

**Expected:** The touch-capable device boots the **👆 Touch** chip; the
plain desktop boots **⌨+🖱 Both** — never keys-only (mouse look must
survive the boot). The first real touch or keypress locks the pick into
the save: after the reload the chip still reads what fired first, and no
later touch or keypress re-picks. An existing saved mode is never
overwritten — the reload boots exactly what was stored. A manual switch
from the mode row or ⚙ persists the same way, the chip follows it at
once, and the touch overlay appears/disappears with the mode.

---

## 9. Panes — minimap & motion [PANE]

### PANE-1 — The minimap guides by default

**Steps:** Load any floor and look at the bottom-left pane column: the
square Pac-minimap canvas. Walk a little and watch it; press `N` once,
then again; toggle the dock's MAP chip as well.

**Expected:** The minimap shows on load — the FULL maze as a Pac-Man-style
guide, no fog of war, your arrow and the wardens' dots moving on a slow
heartbeat. `N` (or the chip) hides the pane and pressing `N` again brings
it back; the chip's pressed state always matches the pane. It is a
session preference — never saved, every fresh boot starts with it on.

### PANE-2 — The motion pane mirrors you

**Steps:** With the motion pane visible above the minimap, stand still;
hold `W`; hold `W`+`Shift`; release. Frost a beacon (`F`) and step
through a mirror (`Space`). Press `B` and watch the compass as you turn.

**Expected:** Standing reads STILL; walking flips the stencil to WALK
with the figure striding (the cycle only advances while you actually
move — push a wall and the pose freezes); `W`+`Shift` leans the figure
forward and reads SPRINT; releasing lands STILL within about two
seconds. A fresh cast raises the lantern arm (FROST), a step-through
holds the bright flash-forward pose (STEP), and the ring's N/E/S/W
rotates with your heading. `B` (or the MOTION chip) hides and shows the
pane; reduced-flash freezes the figure at one pose with the label only.

---

## 10. Session — the front door & the pause [SES] (T13)

### SES-1 — The front door gates the house

**Steps:** Open the game from a bare link — no `?seed=` in the URL (your
personal invite link minus the seed, or clear the site's storage first).
Watch the boot poster fade. While the plate is up, hold `W` and try to
click around the plate. Press `Tab` a couple of times, then `Esc`. Click
**BEGIN THE DESCENT** and walk with `W`; watch the timer chip.

**Expected:** The poster becomes the MIRROR/HOUSE plate and **BEGIN THE
DESCENT** is focused at once. A fresh save (no streak/shards/best yet)
shows **no stats line at all** — not an empty one (T14). While it stands,
nothing behind it hears you:
`W` moves nobody, drags and taps land nowhere, and the timer chip stays `—`
(the run clock was never armed). `Tab` cycles inside the plate only, and
`Esc` does NOT dismiss it — there is no back out of the front door. BEGIN
removes the plate in one beat, and the first `W` after it walks AND starts
the timer, exactly as the game always has.

### SES-2 — A stored campaign says CONTINUE — FLOOR N

**Steps:** Play (or import a save) until you stand on floor 2 or deeper,
close the tab, then open the bare site again (no `?seed=`). Read the plate;
press `Tab`. Then click **CONTINUE — FLOOR N** and read the floor chip.
Reload once more and take **NEW HOUSE** instead; afterwards open a seeded
link (`?seed=YOURCODE`).

**Expected:** The plate now reads **CONTINUE — FLOOR N** (your floor's
number) with **NEW HOUSE** beside it and the mini-stats line under both
(streak · ◆ shards · best). `Tab` cycles BEGIN's replacement and the ghost.
CONTINUE reopens the house on the exact floor you left — the chip names it
(`L02`…) — while NEW HOUSE starts a fresh campaign on a new random seed.
A seeded link never plates: shared codes and the ★ Daily land straight on
that floor, as ever.

### SES-3 — Pause freezes the house; the clock doesn't wait

**Steps:** Begin a run and walk a few steps (the timer must be counting),
then hold `W` and press `P` — or click the dock's PAUSE chip. Watch the
PAUSED plate, your position and the timer chip for a few seconds. Resume
with **RESUME** on the plate while `W` is still held. Then try `P` again,
both ways; finally press `P` before your very first input on a fresh load.

**Expected:** The PAUSED plate rises (the dock chip flips to RESUME,
`aria-pressed` on) and the world freezes mid-stride: held `W` moves nobody,
Echoes/Sentinels/decoys freeze; on flood floors the water level keeps
climbing (its clock is pause-proof too), and nothing can fail you while
plated. The timer chip KEEPS COUNTING through the plate — the plate itself
says why: _the clock keeps counting — the house doesn't wait_. RESUME
releases the still-held walk at once, and `P` and the chip drive the same
toggle both ways; resuming returns focus to whatever the pause took it
from (the dock chip after a chip-click pause, the page after a keyboard
one). Before the run starts there is nothing to pause: `P` is an honest
no-op (no clock to betray yet) — and while a dialog stands (the ?, ⚙ or
📮 overlay) `P` and the chip are no-ops too (T14): the plate never rises
UNDER a modal, the modal keeps its focus, and the pause is taken only
after it closes.

---

_Found something? 📮 in-game (top right) or
[github.com/seolithdev01/mirror-house/issues](https://github.com/seolithdev01/mirror-house/issues)
— always with your chip's `SEED:FLOOR`. Private things: reply to your
invite email._
