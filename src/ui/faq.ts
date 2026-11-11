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
    a: 'Echoes — hollow reflections of past guests, blind to everything but clear glass — and four Sentinels: Chhaya who walks your past, Taal who moves on the beat, Gher who seals exits, Aavart who predicts. The Echoes and Chhaya prowl from floor 1; Taal keeps the beat on floor 5 as a cameo and walks every floor from 11 down as the Sentinel — there his touch catches. The ladder accumulates through Act I — Gher joins at floor 21, Aavart at floor 31, all four walking the Carnival — and Act I closes at floor 40. Then the house rotates its wardens: on the Flood Halls Taal walks alone, at Dwaar V all four gather, in the Furnace Wings Gher and Aavart walk the heat while Taal takes his first rest — and in the Whisper Library below, the Echoes themselves change: they give up mirror-sight and hunt by ear (they hear noise, not glass), Taal\u2019s beat returns at floor 66, and the Dwaar VII duet — Taal and Gher in the stacks — closes the tier.',
  },
  {
    q: 'What is below the Dwaar — the Hall of Ancestors?',
    a: 'Floors 11–20: Tier 2. Clearing Dwaar I claims Truth-Shard I and the descent simply continues — a brief golden banner (✦ Truth-Shard I claimed — the house deepens…), then the stair door opens into the Hall. The loop is the same — frost the beacons, reach the stair door — in warmer, darker halls: four beacons a floor, five to six Echoes, Chhaya 4.5 s behind and tightening to 4.1 s by floor 19 (3.8 s in Dwaar II), and the floor chip reads L11 · T2 up to L19 · T2. The walls hang ancestor portraits, Taal walks every floor, and floor 20 is Dwaar II — his threshold hall; clearing it claims Truth-Shard II, and since the house keeps opening below, the claim shows the same brief banner as Dwaar I and the stairs keep going down — every full screen now lives deeper, ending at Dwaar IV\u2019s act close.',
  },
  {
    q: 'Taal keeps catching me below floor 10 — how do I get past him?',
    a: "From floor 11 he is the Sentinel: his touch fails the floor like any Echo's catch (on floor 5 he only made the house angrier). You cannot blind him — he walks the floor, not the glass — and you cannot outrun the beat, but you can read it. He surges on the beat and nearly stands between beats, on a two-second loop, and his lantern tells you which is which: bright, he is striding; dim, he is crawling. Cross his corridor on the dim beat, and while you wait keep a wall or a corner between you. Break the rhythm, not the glass.",
  },
  {
    q: 'Who are the figures in the portrait mirrors?',
    a: 'The ancestors — dim silhouettes hanging in the glass of every tier-2 floor, two or three per hall. They are mirrors like any other: the Echoes can see you through their clear panes, and one breath of the Frost Lantern (F) fogs their eyes shut for 25 seconds like any standing glass. Ancestor or not — fog them like any glass you would rather they did not watch you through.',
  },
  {
    q: 'What is below the Hall of Ancestors — the Reflecting Gardens?',
    a: 'Floors 21–30: Tier 3. Below Dwaar II the palace turns green — moss walls, water-teal glass, ivory light, hedges for partitions — the floor chip reads L21 · T3 up to L29 · T3, and the music goes pastoral: a flute leads the melody from the first note of the tier. The loop never changes, but the house deepens: six Echoes every floor, four beacons, Chhaya 4.2 s behind tightening to 3.7 s (3.4 s in Dwaar III), still pools of standing water you cannot fog (see the water-mirrors below) — and the Sentinels accumulate: Taal keeps the beat he learned in the Hall, and Gher the Encircler joins him. Both walk every Gardens floor. Floor 30 is Dwaar III, the most open threshold hall in the house — dotted hedges, two sightlines clear across it — and clearing it claims ✦ Truth-Shard III (the same brief banner as the Dwaars above — the Carnival opened below, and the full screen is the act close\u2019s now).',
  },
  {
    q: 'Gher keeps cutting me off below floor 20 — how do I get past him?',
    a: 'That is Gher the Encircler, and he is not chasing you — he is reading you. He predicts where your steps are committed and glides at one steady pace to seal the road about three cells ahead of you: the corridor you were about to take is suddenly his. Frost cannot blind him (he watches nothing — no glass, no eyes, only your heading), and outrunning him only deepens the commit. The verb is the feint: commit one way until he turns for the road ahead, then break the commit and take the other way — the moment your heading leaves the path, his prediction dies and he holds while you walk. Aaina says it best: he does not chase, he closes the road ahead — feint, then go the other way. And remember the ladder accumulates: Taal still keeps his beat down here, so cross him on the dim beat as ever.',
  },
  {
    q: 'What are the water-mirrors — the standing pools?',
    a: "The Reflecting Gardens (floors 21–30) hold still pools of water: two to four a floor, flat teal cells that are Echo eyes like any clear glass — the hollow ones can see you through them from across the hall. You cannot fog water; the Frost Lantern breathes on glass, not lakes. Your one verb is the ripple: walk within arm's reach of a pool and the surface breaks — its eye closes for ten seconds, the caption says so, and its dot on the overhead map dims until the water stills. Cross wide, or ripple first and move while it is blind. Never trust a calm surface you have not disturbed.",
  },
  {
    q: 'What are the distorting mirrors — the carnival glass?',
    a: "The Carnival of Faces (floors 31–40) hangs bent panes of rose glass, two or three a floor — the wavy rose squiggle on your overhead map marks each one. While a pane can see you, it lies about WHERE you are: every Echo's mirror-sight reads you a cell or two off from your true standing, so they chase, ping and hunt the spot the glass shows instead of you. The deception is visible — watch the map's red pings bloom offset from your own arrow — and the caption warns you once. They are eyes too, so treat them like standing glass: face one and breathe the Frost Lantern (F) to fog it for 25 seconds, and the house remembers where you truly stand. Fogging can even shake a chase outright, if the Echo was following the lie.",
  },
  {
    q: 'What is below the Reflecting Gardens — the Carnival of Faces?',
    a: 'Floors 31–40: Tier 4, the last tier of Act I. Below Dwaar III the palace throws a carnival — rose and magenta glass over plum-dark walls, candle-glow diamonds on the floor lattice — and the music turns mischievous: the melody flattens its third and hands the lead back to the reed. The floor chip reads L31 · T4 up to L39 · T4. The loop never changes, but the house plays its last tricks: bent panes of rose glass that lie about where you stand (the distorting mirrors just above), five Echoes a floor (a deliberate step back from the Gardens\u2019 six — three lethal Sentinels walk down here and the Echoes yield the stage), four beacons, Chhaya 3.8 s behind tightening to 3.3 s (3 s in Dwaar IV). All three Sentinels accumulate — Taal\u2019s beat, Gher\u2019s feint, and Aavart the Ambusher joins at floor 31. Floor 40 is Dwaar IV, the funhouse hall — offset alcoves around a central carousel ring you circle while the Sentinels circle you — and clearing it claims ✦ Truth-Shard IV and closes ACT I: the act screen, forty floors and banked shards counted, teasing Act II. That screen is the end of the house for now — the stairs go no deeper until Act II is built.',
  },
  {
    q: 'Aavart keeps intercepting me below floor 30 — how do I get past him?',
    a: "That is Aavart the Ambusher, the fourth Sentinel, and he reads the one thing the others ignore: your pace. He projects where your stride is committed — up to 1.8 seconds of travel ahead at a full sprint — and runs there at the fastest Sentinel pace in the house, cutting the corner before you reach it. Stand still and his lead collapses onto your own next step; sprint and he meets you nearly three cells down the road. The counter is the trick Aaina sells: stand still or change your pace. Walk where you meant to sprint, stop dead mid-corridor — his projection retargets only every 1.2 seconds, so a pace changed inside that window leaves him ambushing an empty road. And remember the ladder accumulates: Taal still keeps his beat and Gher still reads your heading down here, so cross Taal on the dim beat, feint Gher, and walk where Aavart expected you to run.",
  },
  {
    q: 'The house sends a copy of me — what is that?',
    a: 'That is a mirror-you decoy — it means Act II has begun and you are walking the Flood Halls, the Furnace Wings or the Whisper Library (floors 41–70). Every 45 seconds or so the house plants a glass copy of you at a cell 8–12 cells away, and it walks toward the exit at its own steady pace, ignoring you completely. It cannot hurt you, frost does not touch it, and it does not drown. But the Echoes cannot tell a copy from the original: a copy nearer to an Echo than you are becomes "you" — it senses, pings and gives chase after YOUR COPY (in the Flood Halls and Furnace Wings the Echo chases the copy it sees; in the Whisper Library the wardens hunt by ear — and a copy walks silent, so down there it is your footsteps they key on). That is the decoy\u2019s job: bait. Walk up to a copy and touch it, and it shatters — five shards banked toward the floor\u2019s clear, exactly like beacon shards (a failed floor forfeits them). Two copies may stand at once, the caption names each one the house sends, and on the overhead map the copy is the hollow gold circle while the solid gold arrow is the you that is real. And from the Furnace Wings down, the +5 is no longer free: Gher reads a live copy\u2019s cell as one of his objectives and seals it — the caption admits it, The warden guards the copy — so shard-farming now means breaking a warden\u2019s seal first.',
  },
  {
    q: 'What is below the Carnival of Faces — the Flood Halls?',
    a: 'Floors 41–50: Tier 5 — and ACT II opens here. Below Dwaar IV the palace drowns — drowned indigo-green walls, teal glass, pale lantern light — and the music submerges with it: the melody walks a dark pentatonic ([0,3,5,7,10]) on the triangle. The floor chip reads L41 · T5 up to L49 · T5, and the first floor-41 build of a session raises the act banner: ACT II — THE DECEPTION — the house has begun copying you. The loop never changes, but the house has new tricks: the mirror-you decoys just above, halls that flood as you play (the flooding halls just below), and the wardens rotate — Taal walks this tier alone (see the rotation below). Four Echoes a floor, four beacons, Chhaya 3.6 s behind tightening to 3.1 s (2.9 s in Dwaar V). Floor 50 is Dwaar V, the sunken arena — concentric rings, four gates, all FOUR Sentinels walking it together — and clearing it claims ✦ Truth-Shard V with the brief golden banner (the full screens live deeper now), and the stairs keep descending into the Furnace Wings below.',
  },
  {
    q: 'The halls are flooding — what is the water doing?',
    a: "Tier 5's signature: from your first step on a Flood Halls floor (41–50) the water rises, reaching its full 1.2 m depth three minutes in (Dwaar V's sunken arena floods in two — the duel is a race). Three things change as it climbs, all read off one level. Past 0.6 m deep EVERYONE wades at 85 % speed — you, the Echoes, the Sentinels; the copies don't (they never drown). Past 0.9 m the standing glass has sunk far enough that it stops being an Echo eye entirely — the flood blinds the mirrors for you, frost-free, and the drowned panes look it: shrunken toward half height. And the caption warns you once: The halls are flooding…. Your verbs never change, your plan does: take the long crossings early while you can still run, let the water blind the corridors you would have frosted anyway, and never count on wading away from a chase in a flooded hall — everyone is slow down there.",
  },
  {
    q: 'Gher and Aavart vanished below floor 40 — where did they go?',
    a: 'Nowhere — they were resting, and now they are back. The house rotates its wardens: the ladder that accumulated Sentinels through Act I (Taal at 11, Gher at 21, Aavart at 31 — each staying on every floor below) pauses its escalation on the Flood Halls ramp. Floors 41–49 hunt you with Chhaya and Taal alone — Taal never rests on that ramp, his beat walks every floor from 11 down through 50. Gher the Encircler and Aavart the Ambusher sat 41–49 out, and the house called them down together for exactly one hall: floor 50, the Dwaar V duel — the first arena where all four Sentinels walk together, a preview of the Warden\u2019s Warrens still to come. Then the wheel turned again: the Furnace Wings below are Gher and Aavart\u2019s home tier — they walk every floor 51–60, and the warden guards the copies down there — and it turns once more in the Whisper Library: Gher keeps only the Dwaar VII duet at floor 70 (he rests 61–69), Aavart rests the whole tier and returns in tier 8. The quiet ramp\u2019s lesson still holds: a tier\u2019s teeth are never its missing wardens.',
  },
  {
    q: 'Taal vanished below floor 50 — where did he go?',
    a: 'He is resting — the first rest of his career, and a long one now. The house rotates its wardens, and the Furnace Wings (floors 51–60) were the wheel\u2019s second turn: the beat-walker who walked every floor from 11 through 50 sits the heat out, because the beat-and-water pairing was the Flood Halls\u2019 gimmick and the Furnace belongs to Gher and Aavart — the Encircler and the Ambusher walk every Wings floor, and the heat is the tier\u2019s teeth (your frost melts in half the time, and every crack you leave burns 25 anger deep). Tier 7 lengthened the rest through floor 65 — the Dwaar VI crucible now replays without him — and then the Whisper Library brings the beat back: from floor 66 Taal walks again (66–70), and his every bright accent tick now rings like a sprint — noise he ignores but the blind wardens chase — until the Dwaar VII duet at 70. Do not read the quiet beat as safety: Chhaya never rests, Gher seals and Aavart ambushes wherever they walk, and in the Library below the blind wardens are listening.',
  },
  {
    q: 'What is below the Flood Halls — the Furnace Wings?',
    a: 'Floors 51–60: Tier 6 — and ACT II deepens here. Below Dwaar V the palace catches fire — ember and copper glass over charred walls, a low furnace glow, a warm shimmer in the air — and the music turns urgent: the melody walks a Phrygian-adjacent pentatonic ([0,1,5,7,8]) on the triangle. The floor chip reads L51 · T6 up to L59 · T6. The loop never changes, but the heat does two things: your frost evaporates in HALF the time — a fogged pane clears in 12.5 seconds, not 25 — and every mirror you sprint into cracks 25 anger deep, not 15 (four careless cracks to collapse, not seven). The rotation turns too — Gher and Aavart walk the Wings while Taal rests (his answer is just above) — and the mirror-you copies you could farm are guarded now: the warden seals them. Four Echoes a floor, four beacons, Chhaya 3.5 s behind tightening to 2.9 s. Floor 60 is Dwaar VI, the crucible forge — twin parallel forge corridors joined mid-hall by a central crucible chamber — and clearing it claims ✦ Truth-Shard VI with the brief golden banner (tier 7 extended Taal\u2019s rest through the crucible, so it replays as Chhaya + Gher + Aavart, and the full screen now lives deeper, at Dwaar VII) — and the stairs descend into the Whisper Library below.',
  },
  {
    q: 'What is below the Furnace Wings — the Whisper Library?',
    a: 'Floors 61–70: Tier 7 — and ACT II listens here. Below Dwaar VI the palace goes quiet and moonlit: lavender-grey glass over slate walls, dusk-dark floor diamonds, a moon-pale lantern — and the music whispers with it, the melody walking a slow hushed set ([0,2,3,7,8]) on the sine. The floor chip reads L61 · T7 up to L69 · T7. The loop never changes — frost the beacons, reach the stair door — but the house has learned to listen: the Echoes down here have no mirror-sight at all, and they track NOISE (see the noise question just below), so the whole tier is a pace economy — walk, never run the stacks. The rotation holds its breath, too: Chhaya and the blind wardens only on 61–65 (Gher rests after the Furnace he keeps, Aavart rests the whole tier), then the beat comes back — Taal returns at floor 66, his accent ticks ringing through the silence — and floor 70 is Dwaar VII, the library stacks: four shelf-walls with open reading aisles and alcoves, walked by the Taal + Gher DUET. Clearing it claims ✦ Truth-Shard VII, the full tier screen, and the end of the house for now: floors 71–100 are future content.',
  },
  {
    q: 'The Echoes can\u2019t see me below floor 60 — how does the noise work?',
    a: 'They hear instead. On the Whisper Library (floors 61–70) an Echo has no mirror-sight: clear glass, fogged glass, none of it means anything to it, and the fog-a-crowd confusion trick does not work either. What it tracks is NOISE — a ring that spreads from whatever made it and lives about a second. Sprint rings loud — 7 meters. Walk rings soft — 4 meters. Standing still and turning in place are silent. And your verbs ping once at the action, 2.5 meters: a frost\u2019s crunch, a pushed silvered door, a True-Mirror step. On its usual sense tick the Echo checks the ring — the nearest ping it can hear becomes its chase target (with the same two-second chase memory as any hunt), and silence means it keeps patrolling. That is the whole economy, and pace is the lever frost used to be: creep past the stacks, sprint only in bursts, break off and go quiet, and the hunt forgets you in two seconds. Aaina sells the standing rule: They are blind here — but they listen. Walk. Never run the stacks. And from floor 66, mind the beat: Taal\u2019s every bright accent rings like a sprint at HIS position — noise he ignores but every warden chases — so his corridor is the loudest danger in the stacks and the best decoy in the house. Above floor 60 none of this applies: the glass Echoes there are noise-immune — they hear nothing.',
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
  {
    q: 'How do I report a bug or share an idea?',
    a: 'Use the Feedback button in the top-right of the screen — it opens a short form (Bug, Suggestion, or a kind word), and hands you a prefilled GitHub issue with your diagnostics — version, seed, floor, settings — already written in, so you review it and send it yourself. Nothing is ever sent without you seeing it first; prefer email and the same form will compose that instead.',
  },
  {
    q: 'What is this beta — and what is coming next?',
    a: 'The open beta of a game being built in the open: Tier 1 — the ten floors, Chhaya and Taal, the Dwaar and Truth-Shard I — is complete, tuned, and saving on your device, and the launch kit (About, feedback, tester guides) is what you are looking at. Below it the descent has closed ACT I and opened ACT II: Tier 2 — the Hall of Ancestors, floors 11–20, the Sentinel Taal, the ancestor portraits, Dwaar II and Truth-Shard II — Tier 3 — the Reflecting Gardens, floors 21–30, Gher the Encircler, the water-mirrors, the flute-led pastoral score, Dwaar III and Truth-Shard III — Tier 4 — the Carnival of Faces, floors 31–40, Aavart the Ambusher, the distorting mirrors, Dwaar IV and Truth-Shard IV — Tier 5 — the Flood Halls, floors 41–50, the mirror-you decoys, the rising water, the wardens\u2019 rotation, Dwaar V and Truth-Shard V — Tier 6 — the Furnace Wings, floors 51–60, the heat that melts frost and widens cracks, the guarded copies, the rotation\u2019s turn, Dwaar VI and Truth-Shard VI — and Tier 7 — the Whisper Library, floors 61–70, the Echoes gone blind to glass and keen of ear, the noise economy, Taal\u2019s beat back at 66, Dwaar VII and Truth-Shard VII — are delivered and playable now; the Dwaar VII tier screen on floor 70\u2019s clear is the end of the house for now. On the roadmap: the rest of Act II — the Frozen Atrium (floors 71–80) —, more venue packs for local ventures, and more of Aaina’s tongue. Your saves survive the beta; where the house wobbles, the Feedback button in the top-right wants to hear about it.',
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
  // M4/T6 — the heading and the close button are chrome (localized); the 44
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
