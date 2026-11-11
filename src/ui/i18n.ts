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
    // M6/T1 — the Floors section: the venue side-floor card (demo pack + Play)
    'settings.floors': 'Floors',
    'venue.demoName': '☕ Glasshouse Café — DEMO',
    'venue.play': '▶ Play demo floor',
    'venue.return': '↩ Return to campaign',
    'venue.settingsNote': 'Sponsored floors never touch your campaign, shards, or bests.',
    'venue.banner': '☕ {name} floor (daily seed)',
    'venue.bannerNote':
      'Sponsored floor — no shards or bests; your campaign floor restarts when you return.',
    'overlay.venueCleared': 'Floor cleared — return via ⚙',
    'toast.venueRejected': 'Venue floor unavailable',
    // M6/T4 — Aaina's venue refusal (T1 adjudication): the sale is refused,
    // the toast names the way back to her.
    'toast.hintVenue': 'Return to your campaign to ask Aaina',
    // step007/T1 — the ⓘ About panel. Unlike the FAQ's entries (content,
    // English-only), About ships bilingual from day one: a stranger's first
    // question in either language deserves an answer in it.
    'btn.about': 'About this game',
    'about.title': 'About Mirror House',
    'about.version': 'Version {v} · open beta',
    'about.what':
      'A descent through a century-old palace of mirrors through a century-old palace of mirrors. Fog the glass, outwit what hunts you, and walk down — every floor a 2–5 minute puzzle that remembers you.',
    'about.beta':
      'You are playing the open beta: the first tier — floors 1 to 10, Chhaya and Taal, the Dwaar — stands complete; deeper floors, the remaining Sentinels and new venue packs are on the roadmap.',
    'about.credits':
      'An original, open-source work: every wall, word and reflection was made for this house (Apache-2.0 code, CC-BY 4.0 art and words), and the raga-inspired music is generated live in your browser — no samples.',
    'about.source': 'Source',
    'about.privacy': 'Privacy',
    'about.provenance': 'Provenance',
    'about.license': 'License',
    'about.tagline': 'Made of 100% original glass.',
    // step007/T2 — the 📮 feedback composer (bug / suggestion / kind word).
    // Bilingual chrome from day one, like About: the beta's front door for
    // testers in either language. The textarea's prompt + diagnostics header
    // ride the same table; the diagnostics block itself is data (English).
    'btn.feedback': 'Feedback',
    'feedback.title': 'Send feedback',
    'feedback.kind': 'What is it?',
    'feedback.bug': '🐞 Bug',
    'feedback.suggestion': '💡 Suggestion',
    'feedback.love': '💙 A kind word',
    'feedback.summary': 'Title (short)',
    'feedback.body': 'Your message',
    'feedback.github': 'Open GitHub issue',
    'feedback.email': 'Email instead',
    'feedback.privacyNote':
      'Nothing is sent until you press a button — review the text below (diagnostics included) first.',
    'feedback.prompt.bug': 'What happened? What did you do, and what did you expect?',
    'feedback.prompt.suggestion': 'What would make the house better?',
    'feedback.prompt.love': 'Tell us what you loved — the floor, the music, the chase.',
    'feedback.diagHeader':
      'Diagnostics — attached automatically; delete anything you would rather not share:',
    // chips (emoji + label + live value)
    'chip.streak': 'Streak',
    'chip.best': 'Best',
    'chip.timer': 'Timer',
    'chip.beacons': 'Beacons',
    'chip.shards': 'Shards',
    'chip.floor': 'L', // prefix: L01, L02…
    'chip.dwaar': 'DWAAR', // L10 · DWAAR I ✦
    'chip.tier': 'T2', // T2/T1 — the Hall-of-Ancestors suffix: L14 · T2
    'chip.tier3': 'T3', // T3/T1 — the Reflecting-Gardens suffix: L24 · T3
    'chip.tier4': 'T4', // T4/T1 — the Carnival-of-Faces suffix: L34 · T4
    'chip.tier5': 'T5', // T5/T1 — the Flood-Halls suffix: L44 · T5
    // overlays and banners
    'overlay.failCaught': 'Caught by the glass',
    'overlay.failCollapse': 'The mirrors collapsed',
    'overlay.cleared': 'Floor cleared in {s} (best {best})',
    'overlay.clearedBest': '✨ Floor cleared in {s} — new best!',
    'overlay.descend': 'descending…',
    'overlay.tierTitle': '✦ Truth-Shard I claimed — Tier I complete',
    'overlay.tierTitle2': '✦ Truth-Shard II claimed — Tier II complete',
    'overlay.tierTitle3': '✦ Truth-Shard III claimed — Tier III complete',
    'overlay.tierStats': '{floors} floors cleared · {shards} shards banked',
    'overlay.tierNote': 'The shard is already banked — staying is a free walk.',
    // T2/T5 — the Dwaar I interstitial (the T1 adjudication): the shard is
    // claimed mid-descent as a 1.8s auto-dismiss banner. T3/T1: Dwaar II
    // takes the same treatment below; floor 30 keeps the full tier screen.
    'overlay.shardInterstitial': '✦ Truth-Shard I claimed — the house deepens…',
    // T3/T1 — Dwaar II takes the same interstitial one tier down (that tier,
    // the full screen moved to Dwaar III): Act II continues into the Gardens.
    'overlay.shardInterstitial2': '✦ Truth-Shard II claimed — the house deepens…',
    // T4/T1 — Dwaar III cascades to the same interstitial (the full screen
    // is the ACT CLOSE's now): Act I's last descent, into the Carnival.
    'overlay.shardInterstitial3': '✦ Truth-Shard III claimed — the house deepens…',
    // T4/T1 — the Act I completion screen Dwaar IV raises (spec §2.3): the
    // tier-complete overlay re-styled as an act close, with the Act II tease
    // as its note line. Play again / Stay reuse the tier screen's buttons.
    // T5/T1 — the screen itself is RETIRED from the flow (Dwaar IV joins the
    // interstitial cascade; the Act II banner below opens the act instead) —
    // the keys stay, the retired-keys-stay pattern.
    'overlay.actTitle': 'ACT I COMPLETE — The Trap',
    'overlay.actNote': 'Act II: The Deception — the house will start copying you…',
    // T5/T1 — Dwaar IV joins the interstitial cascade (the full screen is the
    // TIER close's now — Dwaar V's).
    'overlay.shardInterstitial4': '✦ Truth-Shard IV claimed — the house deepens…',
    // T5/T1 — the Dwaar V tier screen (floor 50, the row-9 apex duel): the
    // one full screen Act II keeps, the campaign's terminal close.
    'overlay.tierTitle5': '✦ Truth-Shard V claimed — Tier V complete',
    // T5/T1 — the Act II opening banner: the first floor-41 build of a
    // session raises it for 3s, once per session.
    'overlay.actBanner': 'ACT II — THE DECEPTION',
    'overlay.actBannerNote': 'The house has begun copying you.',
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
    // T3/T3 — the water-mirrors: one line per ripple event
    'caption.waterRipple': 'The water ripples — its eye closes.',
    // T4/T3 — the carnival glass: once per attempt, on the first displacement
    'caption.distort': 'The glass shows you somewhere you are not.',
    // T5/T2 — the mirror-you decoys: one line per spawn (per-copy id), one
    // per shatter ({n} = DECOY_SHARD)
    'caption.decoySpawn': 'The house sends a copy of you ahead.',
    'caption.decoyShatter': 'The copy shatters. +{n} shards.',
    // T5/T3 — the rising water: once per floor, as the level crosses 0.3 m
    'caption.flood': 'The halls are flooding…',
    // misc chrome
    'misc.close': '✕ Close ({key})',
    // M5/T6 — the accessible name for every ✕-only close button
    'aria.close': 'Close',
    'misc.playAgain': '↻ Play again',
    // t4 minor (rides t5/T5) — "walk" says exactly what Stay grants; "wander"
    // implied a free-roam verb the grid doesn't have.
    'misc.stay': 'Stay — walk the hall',
    'toast.exported': 'Save exported',
    'toast.rejected': 'Save file rejected',
    'faq.title': 'Mirror House — FAQ',
    // step007/T3 — tester mode's one-time banner (?test=1; the TESTER chip
    // itself is data like the diagnostics block — fps + seed, English-only).
    'tester.banner': 'TESTER MODE — diagnostics unlocked for this session',
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
    // M6/T1 — मंज़िलें अनुभाग: वेन्यू साइड-फ़्लोर कार्ड (डेमो पैक + खेलें)
    'settings.floors': 'मंज़िलें',
    'venue.demoName': '☕ ग्लासहाउस कैफ़े — डेमो',
    'venue.play': '▶ डेमो मंज़िल खेलें',
    'venue.return': '↩ अभियान पर लौटें',
    'venue.settingsNote': 'प्रायोजित मंज़िलें आपके अभियान, शार्ड और सर्वश्रेष्ठ समय को नहीं छूतीं।',
    'venue.banner': '☕ {name} मंज़िल (दैनिक सीड)',
    'venue.bannerNote':
      'प्रायोजित मंज़िल — कोई शार्ड या सर्वश्रेष्ठ नहीं; लौटने पर आपकी अभियान मंज़िल फिर शुरू होती है।',
    'overlay.venueCleared': 'मंज़िल पार — ⚙ से लौटें',
    'toast.venueRejected': 'वेन्यू मंज़िल उपलब्ध नहीं है',
    // M6/T4 — आईना की वेन्यू मनाही (T1 निर्णय): बिक्री अस्वीकृत, टोस्ट वापसी का रास्ता बताता है।
    'toast.hintVenue': 'आईना से पूछने के लिए अपने अभियान पर लौटें',
    // step007/T1 — ⓘ पैनल: दिन-एक से द्विभाषी
    'btn.about': 'इस खेल के बारे में',
    'about.title': 'मिरर हाउस के बारे में',
    'about.version': 'संस्करण {v} · खुला बीटा',
    'about.what':
      'सौ मंज़िलों की फ़रारी, एक सौ साल पुराने दर्पण-महल से। काँच जमाइए, शिकारी को चतुराई से पछाड़िए और नीचे उतरिए — हर मंज़िल दो से पाँच मिनट की एक पहेली है जो आपको याद रखती है।',
    'about.beta':
      'आप खुला बीटा खेल रहे हैं: पहला चरण — मंज़िल 1 से 10, छाया और ताल, द्वार — पूरा खड़ा है; गहरी मंज़िलें, बाकी संतरी और नई वेन्यू मंज़िलें रोडमैप पर हैं।',
    'about.credits':
      'एक मौलिक, खुला-स्रोत रचना: हर दीवार, हर शब्द, हर परछाईँ इसी घर के लिए बनी (कोड Apache-2.0, कला और शब्द CC-BY 4.0), और राग-प्रेरित संगीत आपके ब्राउज़र में ही जीवंत रचा जाता है — कोई सैंपल नहीं।',
    'about.source': 'स्रोत',
    'about.privacy': 'गोपनीयता',
    'about.provenance': 'उद्गम',
    'about.license': 'लाइसेंस',
    'about.tagline': 'शत-प्रतिशत मौलिक काँच से बना।',
    // step007/T2 — 📮 प्रतिक्रिया संगीकर्ता: दिन-एक से द्विभाषी
    'btn.feedback': 'प्रतिक्रिया',
    'feedback.title': 'प्रतिक्रिया भेजें',
    'feedback.kind': 'यह क्या है?',
    'feedback.bug': '🐞 त्रुटि',
    'feedback.suggestion': '💡 सुझाव',
    'feedback.love': '💙 अच्छा लगा',
    'feedback.summary': 'शीर्षक (संक्षेप में)',
    'feedback.body': 'आपका संदेश',
    'feedback.github': 'GitHub इशू खोलें',
    'feedback.email': 'ईमेल करें',
    'feedback.privacyNote':
      'बटन दबाने तक कुछ नहीं भेजा जाता — पहले नीचे का पूरा पाठ (निदान सहित) देख लीजिए।',
    'feedback.prompt.bug': 'क्या हुआ? आपने क्या किया, और क्या होना चाहिए था?',
    'feedback.prompt.suggestion': 'घर को और बेहतर क्या बनाएगा?',
    'feedback.prompt.love': 'बताइए क्या अच्छा लगा — मंज़िल, संगीत, शिकार।',
    'feedback.diagHeader': 'निदान — स्वतः जुड़ा है; जो साझा नहीं करना चाहते, वह मिटा दीजिए:',
    // चिपें — छोटे शब्द, एक ही पंक्ति
    'chip.streak': 'लय',
    'chip.best': 'सर्वश्रेष्ठ',
    'chip.timer': 'समय',
    'chip.beacons': 'बीकन',
    'chip.shards': 'शार्ड',
    'chip.floor': 'स्तर ', // उपसर्ग: स्तर 01, स्तर 02…
    'chip.dwaar': 'द्वार', // स्तर 10 · द्वार I ✦
    'chip.tier': 'चरण 2', // T2/T1 — पूर्वजों की हॉल प्रत्यय: स्तर 14 · चरण 2
    'chip.tier3': 'चरण 3', // T3/T1 — प्रतिबिंब-उद्यान प्रत्यय: स्तर 24 · चरण 3
    'chip.tier4': 'चरण 4', // T4/T1 — आरसी-का-मेला प्रत्यय: स्तर 34 · चरण 4
    'chip.tier5': 'चरण 5', // T5/T1 — बाढ़ की हॉलें प्रत्यय: स्तर 44 · चरण 5
    // परदे और पट्टियाँ — घर की आवाज़ में, पर संक्षेप में
    'overlay.failCaught': 'काँच ने आपको पकड़ लिया',
    'overlay.failCollapse': 'दर्पण ढह गए',
    'overlay.cleared': 'मंज़िल {s} में पार (सर्वश्रेष्ठ {best})',
    'overlay.clearedBest': '✨ मंज़िल {s} में पार — नया सर्वश्रेष्ठ!',
    'overlay.descend': 'नीचे उतर रहे हैं…',
    'overlay.tierTitle': '✦ सत्य-शार्ड प्राप्त — चरण I पूर्ण',
    'overlay.tierTitle2': '✦ सत्य-शार्ड II प्राप्त — चरण II पूर्ण',
    'overlay.tierTitle3': '✦ सत्य-शार्ड III प्राप्त — चरण III पूर्ण',
    'overlay.tierStats': '{floors} मंज़िलें पार · {shards} शार्ड जमा',
    'overlay.tierNote': 'शार्ड जमा हो चुका है — रुकना एक मुफ़्त सैर है।',
    // T2/T5 — द्वार I का अंतराल: शार्ड बीच-उतराई में मिलता है (1.8 सेकंड का
    // स्वतः-मिटने वाला बैनर)। T3/T1: द्वार II को भी यही अंतराल; मंज़िल 30 को
    // पूर्ण चरण-परदा मिलता है।
    'overlay.shardInterstitial': '✦ सत्य-शार्ड I प्राप्त — घर और गहरा होता है…',
    // T3/T1 — द्वार II का अंतराल (पूर्ण चरण-परदा अब द्वार III का है)
    'overlay.shardInterstitial2': '✦ सत्य-शार्ड II प्राप्त — घर और गहरा होता है…',
    // T4/T1 — द्वार III का अंतराल (पूर्ण परदा अब अंक-समाप्ति का है)
    'overlay.shardInterstitial3': '✦ सत्य-शार्ड III प्राप्त — घर और गहरा होता है…',
    // T4/T1 — द्वार IV पर अंक I का समापन-परदा: अंक II की झलक इसकी टिप्पणी है
    // T5/T1 — परदा सेवानिवृत्त (द्वार IV अब अंतराल-श्रृंखला में); कुंजियाँ रहती हैं
    'overlay.actTitle': 'अंक I पूर्ण — जाल',
    'overlay.actNote': 'अंक II: धोखा — घर अब आपकी नक़ल करने लगेगा…',
    // T5/T1 — द्वार IV अंतराल-श्रृंखला में शामिल (पूर्ण परदा अब द्वार V का है)
    'overlay.shardInterstitial4': '✦ सत्य-शार्ड IV प्राप्त — घर और गहरा होता है…',
    // T5/T1 — द्वार V का चरण-परदा (मंज़िल 50, नौवीं पंक्ति का शिखर-द्वंद्व)
    'overlay.tierTitle5': '✦ सत्य-शार्ड V प्राप्त — चरण V पूर्ण',
    // T5/T1 — अंक II का उद्घाटन-बैनर: सत्र के पहले मंज़िल-41 निर्माण पर 3 सेकंड
    'overlay.actBanner': 'अंक II — धोखा',
    'overlay.actBannerNote': 'घर ने आपकी नक़ल करना शुरू कर दी है।',
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
    'caption.waterRipple': 'पानी में लहर उठी — उसकी आँख बंद हो गई।',
    // T4/T3 — कार्निवल का काँच: हर कोशिश में एक बार, पहले विचलन पर
    'caption.distort': 'शीशा आपको उस जगह दिखा रहा है, जहाँ आप नहीं हैं।',
    // T5/T2 — आईने जैसी प्रतिलिपियाँ: हर स्पॉन पर एक पंक्ति (प्रति-प्रतिलिपि id),
    // और टूटने पर एक ({n} = DECOY_SHARD)
    'caption.decoySpawn': 'घर आपकी एक प्रतिलिपि आगे भेजता है।',
    'caption.decoyShatter': 'प्रतिलिपि बिखर गई। +{n} शार्ड।',
    // T5/T3 — उठता पानी: प्रति तल एक बार, जब पानी 0.3 मी पार करता है
    'caption.flood': 'गलियाँ पानी से भरने लगी हैं…',
    // शेष क्रोम
    'misc.close': '✕ बंद करें ({key})',
    // M5/T6 — केवल ✕ वाले बंद बटनों का सुगम नाम
    'aria.close': 'बंद करें',
    'misc.playAgain': '↻ फिर से खेलें',
    'misc.stay': 'रुकें — हॉल में चलें',
    'toast.exported': 'सेव निर्यात हुआ',
    'toast.rejected': 'सेव फ़ाइल अस्वीकृत',
    'faq.title': 'मिरर हाउस — सहायता',
    // step007/T3 — टेस्टर मोड का एक बार का बैनर (?test=1)
    'tester.banner': 'टेस्टर मोड — इस सत्र के लिए डायग्नॉस्टिक्स खुले हैं',
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
  'chip.tier',
  'chip.tier3',
  'chip.tier4',
  'chip.tier5',
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
