// SPDX-License-Identifier: Apache-2.0
//
// ui-pod — the System Atlas's machinery, extracted from the old inline
// <script> when the page moved to public/ (the site CSP is script-src
// 'self' + require-trusted-types-for 'script', so an inline script would
// die in production). Everything below is the same data and the same
// machines as before — the one behavioral change is compliance: every
// former innerHTML assignment is now explicit DOM building (createElement
// + textContent), because a Trusted-Types page cannot assign innerHTML.

'use strict';
/* ============================================================
   THE DATA — a faithful JS port of the shipped formulas.
   (campaign.ts: floorParams / tierOf / presence; floorObjects:
   textureParamsForTier; frost.ts: heat fog factor.)
   ============================================================ */
const TIER_ONE_FLOORS=10, TIER_TWO_FLOORS=20, TIER_THREE_FLOORS=30, TIER_FOUR_FLOORS=40,
      TIER_FIVE_FLOORS=50, TIER_SIX_FLOORS=60, TIER_SEVEN_FLOORS=70, TIER_EIGHT_FLOORS=80,
      TIER_NINE_FLOORS=90, TIER_TEN_FLOORS=100;
const BEACON_RAMP=[2,2,3,3,3,4,4,4,4,4];
const T2_ECHO_RAMP=[5,5,5,6,6,6,6,6,6,6];
const FOG_DURATION_MS=25000, HEAT_FOG_FACTOR=0.5, HEAT_CRACK_ANGER=25, CRACK_ANGER=15;
const CHHAYA_BASE_MS=7000;

function tierOf(f){
  return f>TIER_NINE_FLOORS?10:f>TIER_EIGHT_FLOORS?9:f>TIER_SEVEN_FLOORS?8:f>TIER_SIX_FLOORS?7:
         f>TIER_FIVE_FLOORS?6:f>TIER_FOUR_FLOORS?5:f>TIER_THREE_FLOORS?4:f>TIER_TWO_FLOORS?3:
         f>TIER_ONE_FLOORS?2:1;
}
function isDwaar(f){return [10,20,30,40,50,60,70,80,90].includes(f);}
function isFinale(f){return f===TIER_TEN_FLOORS;}
function floorParams(f){
  const dwaar=isDwaar(f);
  if(isFinale(f)) return {echoes:6,beacons:4,braid:0.08,chhayaDelayMs:2200};
  if(f>TIER_NINE_FLOORS) return {echoes:6,beacons:4,braid:0.1+0.002*(f-TIER_NINE_FLOORS-1),chhayaDelayMs:Math.max(2300,2900-50*(f-TIER_NINE_FLOORS-1))};
  if(f>TIER_EIGHT_FLOORS) return {echoes:dwaar?6:5,beacons:4,braid:0.4+0.004*(f-TIER_EIGHT_FLOORS-1),chhayaDelayMs:dwaar?2300:Math.max(2400,3000-60*(f-TIER_EIGHT_FLOORS-1))};
  if(f>TIER_SEVEN_FLOORS) return {echoes:dwaar?5:4,beacons:4,braid:0.38+0.004*(f-TIER_SEVEN_FLOORS-1),chhayaDelayMs:dwaar?2500:Math.max(2600,3200-60*(f-TIER_SEVEN_FLOORS-1))};
  if(f>TIER_SIX_FLOORS) return {echoes:dwaar?5:4,beacons:4,braid:0.36+0.004*(f-TIER_SIX_FLOORS-1),chhayaDelayMs:dwaar?2600:Math.max(2700,3300-60*(f-TIER_SIX_FLOORS-1))};
  if(f>TIER_FIVE_FLOORS) return {echoes:dwaar?5:4,beacons:4,braid:0.32+0.004*(f-TIER_FIVE_FLOORS-1),chhayaDelayMs:dwaar?2800:Math.max(2900,3500-60*(f-TIER_FIVE_FLOORS-1))};
  if(f>TIER_FOUR_FLOORS) return {echoes:dwaar?5:4,beacons:4,braid:0.28+0.004*(f-TIER_FOUR_FLOORS-1),chhayaDelayMs:dwaar?2500:Math.max(2600,3200-60*(f-TIER_FOUR_FLOORS-1))};
  if(f>TIER_THREE_FLOORS) return {echoes:dwaar?5:4,beacons:4,braid:0.24+0.004*(f-TIER_THREE_FLOORS-1),chhayaDelayMs:dwaar?2300:Math.max(2700,3300-60*(f-TIER_THREE_FLOORS-1))};
  if(f>TIER_TWO_FLOORS) return {echoes:6,beacons:4,braid:0.22+0.004*(f-TIER_TWO_FLOORS-1),chhayaDelayMs:dwaar?2300:Math.max(2400,3000-60*(f-TIER_TWO_FLOORS-1))};
  return {echoes:4,beacons:BEACON_RAMP[f-1],braid:0.15,chhayaDelayMs:CHHAYA_BASE_MS};
}
function textureParamsForTier(t){
  if(t===2) return {portraits:2,water:0,waterRoll:3,distort:0};
  if(t===3) return {portraits:0,water:2,waterRoll:3,distort:0};
  if(t===4) return {portraits:0,water:0,waterRoll:3,distort:2};
  if(t===9) return {portraits:0,water:2,waterRoll:2,distort:1};
  return {portraits:0,water:0,waterRoll:3,distort:0};
}
const taalPresent=f=>(f>=11&&f<=50)||(f>=66&&f<=TIER_SEVEN_FLOORS)||(f>=TIER_EIGHT_FLOORS&&f<=TIER_NINE_FLOORS);
const gherPresent=f=>(f>=21&&f<=TIER_FOUR_FLOORS)||(f>=TIER_FIVE_FLOORS&&f<=TIER_SIX_FLOORS)||f===TIER_SEVEN_FLOORS||(f>=TIER_EIGHT_FLOORS&&f<=TIER_NINE_FLOORS);
const aavartPresent=f=>(f>=31&&f<=TIER_FOUR_FLOORS)||(f>=TIER_FIVE_FLOORS&&f<=TIER_SIX_FLOORS)||(f>TIER_SEVEN_FLOORS&&f<=TIER_NINE_FLOORS);
const decoysOn=f=>f>=41&&f<=TIER_NINE_FLOORS;
const heatOn=f=>(f>=51&&f<=60)||(f>=81&&f<=90);
const tierNames={1:'THE GLASS GALLERY',2:'THE HALL OF ANCESTORS',3:'THE REFLECTING GARDENS',4:'THE CARNIVAL OF FACES',5:'THE FLOOD HALLS',6:'THE FURNACE WINGS',7:'THE WHISPER LIBRARY',8:'THE FROZEN ATRIUM',9:"THE WARDEN'S WARRENS",10:'THE FOUNDATIONS'};
const tierTex={1:'glass · silvered doors · true pairs',2:'ancestor portraits',3:'water pools',4:'distorting panes',5:'flood + decoys',6:'heat (fog ×0.5 · cracks 25)',7:'noise economy',8:'everything pre-frozen',9:'all textures, all wardens',10:'no mirrors · the Glazier'};

/* ============================================================
   THE LOOP — animated GamePhase machine
   ============================================================ */
const NODES={ready:[177,210],running:[440,210],cleared:[705,100],failing:[705,354]};
const EDGES=[
  {id:'rr',from:'ready',to:'running',mid:[305,196]},
  {id:'rc',from:'running',to:'cleared',mid:[555,118]},
  {id:'rf',from:'running',to:'failing',mid:[555,300]},
  {id:'fr',from:'failing',to:'ready',mid:[420,318]},
  {id:'cr',from:'cleared',to:'ready',mid:[470,150]},
];
const SEQ=[
  {edge:'rr',to:'running'},
  {edge:'rc',to:'cleared'},
  {edge:'cr',to:'ready'},
  {edge:'rr',to:'running'},
  {edge:'rf',to:'failing'},
  {edge:'fr',to:'ready'},
  {edge:'rr',to:'running'},
  {edge:'rf',to:'failing'},
  {edge:'fr',to:'ready'},
  {edge:'rr',to:'running'},
  {edge:'rc',to:'cleared'},
];
const PHASE_TEXT={
  ready:'spawn point. Ice intact, water drained, the noise ring empty, pending shards forfeited. First input arms the timer — and the flood.',
  running:'everything lives: Echoes, Chhaya, Taal, Gher, Aavart — and from 41 on, your own copies; from 81 on, all four wardens at once. The water rises. The noise ring accumulates.',
  cleared:'the door opens. Dwaar floors cascade a shard interstitial; floor 100 ends the descent — THE GROUND DOOR OPENS, and the campaign rests, terminal.',
  failing:'frozen 1.2 seconds. Same seed, attempts +1, pending beacon shards forfeited, ice re-frozen, water drained, copies cleared. The maze is knowledge — and knowledge survives the reset.',
};
let seqIdx=0, auto=true, autoTimer=null;
const token=document.getElementById('token');
const card=document.getElementById('phase-card');
function setPhaseUI(phase){
  document.querySelectorAll('.sm .node').forEach(n=>n.classList.remove('active'));
  document.getElementById('n-'+phase).classList.add('active');
  const txt=PHASE_TEXT[phase];
  const name=phase.toUpperCase();
  // Trusted Types: the old innerHTML template, built as real DOM.
  card.replaceChildren();
  const b=document.createElement('b'); b.textContent=name;
  const span=document.createElement('span'); span.textContent=' '+txt;
  card.append(b, span);
}
function lightEdge(id){
  document.querySelectorAll('.sm .edge,.sm .lbl').forEach(e=>e.classList.remove('lit'));
  const e=document.getElementById('e-'+id), l=document.getElementById('l-'+id);
  if(e) e.classList.add('lit'); if(l) l.classList.add('lit');
}
function moveTo(phase,edge){
  const [x,y]=NODES[phase];
  if(edge) lightEdge(edge);
  token.style.transition='cx .9s ease, cy .9s ease';
  token.setAttribute('cx',x); token.setAttribute('cy',y);
  setTimeout(()=>setPhaseUI(phase),900);
}
function stepLoop(){
  const step=SEQ[seqIdx%SEQ.length];
  if(auto) lightEdge(step.edge);
  moveTo(step.to,step.edge);
  seqIdx++;
}
token.setAttribute('cx',NODES.ready[0]); token.setAttribute('cy',NODES.ready[1]);
setPhaseUI('ready');
function startAuto(){ if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  autoTimer=setInterval(()=>{ if(auto) stepLoop(); },1800); }
startAuto();
document.getElementById('btn-auto').addEventListener('click',e=>{
  auto=!auto; e.target.textContent=auto?'⏸ pause the loop':'▶ resume the loop';
});
document.getElementById('btn-step').addEventListener('click',()=>{ auto=false; document.getElementById('btn-auto').textContent='▶ resume the loop'; stepLoop(); });

/* ============================================================
   THE DESCENT — 100 floors from the ported formulas
   ============================================================ */
const descent=document.getElementById('descent');
const detail=document.getElementById('floor-detail');
let selectedFloor=1;
function floorFacts(f){
  const t=tierOf(f), p=floorParams(f);
  return {f,t,p,
    taal:taalPresent(f),gher:gherPresent(f),aavart:aavartPresent(f),
    decoys:decoysOn(f),heat:heatOn(f),tex:textureParamsForTier(t),
    dwaar:isDwaar(f),finale:isFinale(f)};
}
function renderDescent(){
  for(let f=1;f<=100;f++){
    const d=document.createElement('div');
    const t=tierOf(f);
    d.className=`floor t${t}${isDwaar(f)?' dwaar':''}${f===selectedFloor?' sel':''}`;
    d.textContent=isDwaar(f)?('✦'+f):(f%5===0||f===1?String(f):'');
    d.title=`Floor ${f} — Tier ${t}`;
    d.addEventListener('click',()=>{selectedFloor=f;renderDescent();showFloor(f);});
    descent.appendChild(d);
  }
  showFloor(selectedFloor);
}
function showFloor(f){
  const x=floorFacts(f);
  const sent=[x.taal?'Taal':null,x.gher?'Gher':null,x.aavart?'Aavart':null].filter(Boolean).join(' + ')||'Chhaya alone';
  const rows=[
    ['tier',`T${x.t} — ${tierNames[x.t]}`],
    ['echoes / beacons',`${x.p.echoes} echoes · ${x.p.beacons} beacons`],
    ['chhaya delay',`${x.p.chhayaDelayMs} ms behind you`],
    ['braid',x.p.braid.toFixed(3)],
    ['wardens',x.f===100?'THE GLAZIER (teleports every 12 s)':sent],
    ['decoys',x.decoys?'the house copies you':'no copies'],
    ['heat',x.heat?'frost melts ×0.5 · cracks 25':'glass holds'],
    ['textures',tierTex[x.t]],
    ['moment',x.finale?'THE GROUND DOOR OPENS':(x.dwaar?'✦ Truth-Shard threshold':'descend')],
  ];
  // Trusted Types: the old .kv innerHTML template, built as real DOM.
  detail.replaceChildren();
  const kv=document.createElement('div');
  kv.className='kv';
  for(const [k,v] of rows){
    const key=document.createElement('div'); key.className='k'; key.textContent=k;
    const val=document.createElement('div'); val.textContent=v;
    kv.append(key,val);
  }
  detail.appendChild(kv);
}
renderDescent();

/* ============================================================
   THE WARDENS
   ============================================================ */
const WARDENS=[
  {name:'CHHAYA',glyph:'👤',role:'your shadow · floors 1–100',speed:'replays your recorded path (7 s → 2.2 s)',counter:'never retrace a corner you came from — fog behind you, step through glass ahead'},
  {name:'TAAL',glyph:'🥁',role:'the beat-walker · 11–50, 66–70, 80–90',speed:'1.6 × pulse (2.2 on the accent, 0.3 on the rest)',counter:'cross when the lantern dims — his beat is your metronome'},
  {name:'GHER',glyph:'🚪',role:'the encircler · 21–40, 50–60, 70, 81–90',speed:'1.9 m/s to the road ahead',counter:'he never chases — feint one way, take the other road'},
  {name:'AAVART',glyph:'🏹',role:'the ambusher · 31–40, 50–60, 71–90',speed:'2.4 m/s to your projected corner',counter:'change your pace — sprint projects him far, walking collapses his lead'},
  {name:'THE GLAZIER',glyph:'🤍',role:'the master · floor 100',speed:'teleports every 12 s to the farthest cell, then walks at 2.0',counter:'nothing lures him, nothing blinds him — learn his rhythm between perches'},
];
// Trusted Types: the warden cards, built as real DOM.
const wardensRoot=document.getElementById('wardens');
for(const w of WARDENS){
  const cardEl=document.createElement('div'); cardEl.className='warden';
  const glyph=document.createElement('div'); glyph.className='glyph'; glyph.textContent=w.glyph;
  const h3=document.createElement('h3'); h3.textContent=w.name;
  const role=document.createElement('div'); role.className='role'; role.textContent=w.role;
  const floors=document.createElement('div'); floors.className='floors'; floors.textContent=w.speed;
  const p=document.createElement('p'); p.textContent=w.counter;
  cardEl.append(glyph,h3,role,floors,p);
  wardensRoot.appendChild(cardEl);
}

/* ============================================================
   USE-CASES — the catalog, filterable
   ============================================================ */
const UCS=[
 {dom:'session',id:'UC-01',t:'First run',f:'no save → defaults → random seed → floor 1'},
 {dom:'session',id:'UC-02',t:'Returning run',f:'IndexedDB save → resume campaign + settings'},
 {dom:'session',id:'UC-03',t:'v1 migration',f:'legacy meta → save v2, one-time'},
 {dom:'session',id:'UC-04',t:'URL overrides',f:'?seed ?look ?lang ?perf ?venue ?test'},
 {dom:'session',id:'UC-05',t:'Install & go offline',f:'service worker precache + runtime cache'},
 {dom:'loop',id:'UC-06',t:'Move',f:'3 input modes · wall clamp + slide'},
 {dom:'loop',id:'UC-07',t:'Change pace',f:'sprint / walk / stand — the tier-7 + Aavart economy'},
 {dom:'loop',id:'UC-08',t:'Frost a pane',f:'eye closes 25 s (12.5 s in heat)'},
 {dom:'loop',id:'UC-09',t:'Thaw frozen glass',f:'Tier 8: breath wakes it — eye + 10 m lure'},
 {dom:'loop',id:'UC-10',t:'Capture a beacon',f:'+5 shards · all beacons unlock the exit'},
 {dom:'loop',id:'UC-11',t:'Crack glass',f:'+15 anger (+25 in heat) · 100 = collapse'},
 {dom:'loop',id:'UC-12',t:'True-Mirror step',f:'Space → teleport to the twin pane'},
 {dom:'loop',id:'UC-13',t:'Push a silvered door',f:'E → secret routes'},
 {dom:'loop',id:'UC-14',t:'Ripple a pool',f:'adjacency blinds the eye 10 s'},
 {dom:'loop',id:'UC-15',t:'Stay silent',f:'Tier 7: stand still, the ring dies'},
 {dom:'loop',id:'UC-16',t:'Use a decoy',f:'lure / shatter +5 · Gher guards them'},
 {dom:'loop',id:'UC-17',t:'Evade a Sentinel',f:'shadow · beat · seal · ambush — each has a counter'},
 {dom:'loop',id:'UC-18',t:'Read the rotation',f:'who hunts per floor — pinned truth table'},
 {dom:'loop',id:'UC-19',t:'Fail & retry',f:'same seed · 1.2 s freeze · pending forfeited'},
 {dom:'loop',id:'UC-20',t:'Clear & descend',f:'exit unlocks → deeper · floor 100 = the Door'},
 {dom:'loop',id:'UC-21',t:'Invert the verb',f:'Tier 8: frost thaws instead of fogs'},
 {dom:'knowledge',id:'UC-22',t:'Ask Aaina',f:'the diegetic FAQ, in your lantern'},
 {dom:'knowledge',id:'UC-23',t:'Buy a hint',f:'5 + 5·n shards · contextual to the floor'},
 {dom:'knowledge',id:'UC-24',t:'Unlock lore',f:'1/3/6 clears → 2/4/6 entries'},
 {dom:'knowledge',id:'UC-25',t:'Read captions',f:'13+ events · aria-live · en/hi'},
 {dom:'views',id:'UC-26',t:'Cycle views',f:'V: FOCUS → QUAD → OVERHEAD'},
 {dom:'views',id:'UC-27',t:'Plan in TACTICAL',f:'T pauses the world · click waypoints'},
 {dom:'views',id:'UC-28',t:'Read the fog map',f:'visited cells · wardens as pings'},
 {dom:'views',id:'UC-29',t:'See through the lie',f:'Tier 4 panes displace your apparent spot'},
 {dom:'settings',id:'UC-30',t:'Tune accessibility',f:'text scale · reduced-flash · captions'},
 {dom:'settings',id:'UC-31',t:'Remap keys',f:'capture UI with conflict guard'},
 {dom:'settings',id:'UC-32',t:'Auto quality',f:'FPS hysteresis → pixel ratio + RT budget'},
 {dom:'settings',id:'UC-33',t:'Mute / hear the score',f:'10 scales · 3 voices · starts on gesture'},
 {dom:'settings',id:'UC-34',t:'Switch language',f:'🌐 en/hi · full chrome parity'},
 {dom:'persistence',id:'UC-35',t:'Auto-save',f:'250 ms debounce · flush at the irreversible'},
 {dom:'persistence',id:'UC-36',t:'Export a save',f:'💾 single JSON file'},
 {dom:'persistence',id:'UC-37',t:'Import a save',f:'📂 strict-validated → refused or reloaded'},
 {dom:'persistence',id:'UC-38',t:'Keep a streak',f:'daily clears · best time per floor-seed'},
 {dom:'meta',id:'UC-39',t:'Read About / FAQ',f:'ⓘ panel · 40+ entries en/hi'},
 {dom:'meta',id:'UC-40',t:'Send feedback',f:'📮 prefilled issue + diagnostics — you press send'},
 {dom:'meta',id:'UC-41',t:'Play a venue floor',f:'☕ demo pack · campaign isolated'},
 {dom:'meta',id:'UC-42',t:'Test with diagnostics',f:'?test=1 → hook + chip (session-only)'},
 {dom:'meta',id:'UC-43',t:'Play the Daily',f:'★ one shared house per day'},
 {dom:'meta',id:'UC-44',t:'iOS build',f:'planned — runbook ready, needs a Mac'},
 {dom:'meta',id:'UC-45',t:'Venue partner packs',f:'planned — system shipped, partner pending'},
 {dom:'meta',id:'UC-46',t:'Act IV',f:'someday — the copies\u2019 turn'},
 {dom:'meta',id:'UC-47',t:'Composed soundtrack',f:'planned — CLA + provenance pipeline'},
 {dom:'meta',id:'UC-48',t:'Playtest triage',f:'invited — reports land as labeled issues'},
];
const list=document.getElementById('uc-list');
const q=document.getElementById('uc-q');
let domFilter='all';
function renderUCs(){
  const query=q.value.trim().toLowerCase();
  list.replaceChildren();
  let shown=0;
  for(const u of UCS){
    const domOk=domFilter==='all'||u.dom===domFilter;
    const qOk=!query||(u.id+' '+u.t+' '+u.f+' '+u.dom).toLowerCase().includes(query);
    if(!domOk||!qOk) continue;
    shown++;
    const d=document.createElement('div');
    d.className='uc';
    // Trusted Types: the use-case card, built as real DOM.
    const idEl=document.createElement('span'); idEl.className='id'; idEl.textContent=u.id+' ';
    const tEl=document.createElement('span'); tEl.className='t'; tEl.textContent=u.t;
    const flow=document.createElement('div'); flow.className='flow'; flow.textContent=u.f;
    const an=document.createElement('div'); an.className='an'; an.textContent=u.dom;
    d.append(idEl,tEl,flow,an);
    list.appendChild(d);
  }
  document.getElementById('uc-count').textContent=`${shown} of ${UCS.length} use-cases shown — full flows: USE-CASES.md`;
}
q.addEventListener('input',renderUCs);
document.querySelectorAll('.chip[data-dom]').forEach(c=>c.addEventListener('click',()=>{
  document.querySelectorAll('.chip[data-dom]').forEach(x=>x.classList.remove('on'));
  c.classList.add('on'); domFilter=c.dataset.dom; renderUCs();
}));
renderUCs();

/* ============================================================
   MACHINES registry
   ============================================================ */
const MACHINES=[
  ['GamePhase','ready · running · failing · cleared','src/game/floorRun.ts','the master — every system reads it'],
  ['Campaign','floors 1–100 · descend · completeTier · isFinale','src/game/campaign.ts','terminal at 100 — THE GROUND DOOR'],
  ['MirrorVisual','clear · frozen · fogged · thawed · captured','src/game/frost.ts','sight + display, one derivation'],
  ['Echo mode × sense','patrol · chase · confused × glass · ears','src/game/echo.ts','hearing on Tier 7'],
  ['DoorPhase','closed · opening · open','src/game/passages.ts','one push per door'],
  ['Decoys','spawn · walk · shattered','src/game/decoy.ts','the house copies you (41–90)'],
  ['Water level','derived: 180 s → 1.2 m','src/game/waterLevel.ts','the mirrors drown (flood + apex)'],
  ['Noise ring','emit · hears · loudestAt','src/game/noise.ts','Tier 7 hears, glass never reads it'],
  ['Heat bands','(51–60) ∥ (81–90)','src/game/heat.ts','fog ×0.5 · cracks 25'],
  ['Save document','v2 · validated · debounced','src/game/save.ts','IDB truth · v1 migrated once'],
  ['ViewMode','focus · quad · overhead · tactical','src/game/viewMode.ts','tactical pauses the world'],
  ['Settings','a11y · perf · controls','src/ui/settings.ts','configuration, not machines'],
];
// Trusted Types: the registry table, built as real DOM.
const machines=document.getElementById('machines');
{
  const head=document.createElement('tr');
  for(const h of ['machine','states','owner','note']){
    const th=document.createElement('th'); th.textContent=h; head.appendChild(th);
  }
  machines.appendChild(head);
  for(const m of MACHINES){
    const tr=document.createElement('tr');
    for(const cell of m){
      const td=document.createElement('td'); td.textContent=cell; tr.appendChild(td);
    }
    machines.appendChild(tr);
  }
}
