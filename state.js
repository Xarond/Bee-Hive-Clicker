'use strict';
/* ================= State ================= */
const state = {
  // ... existing state properties ...
  

  version:META.version,
  realm:'classic',
  worldKey:'meadow',
  unlockedWorlds:['meadow'],
  purchasedWorlds:{ meadow:true },
  ap:0, ec:0, apSpent:0,
  resources: Object.fromEntries(baseResClassic.map(k=>[k,0])),
  totals:    Object.fromEntries(baseResClassic.map(k=>[k,0])),
  worldCurrencies: {},
  classicStates:{ meadow:null, forest:null },   // << NEW
  realmStates:{ grotto:null, clock:null, starlight:null },
  upgrades:{}, research:{}, apUpg:{}, ecUpg:{},
  researchActive:null,
  hives:[], bred:[], ach:{},
  mods:{ globalMulti:1, convEff:DIFFICULTY.startConv, pressCap:DIFFICULTY.startPress, clickBase:1, critChance:0, critMult:2, tickMult:1, storage:1, offlineExtra:0, costCurve:0 },
  realmMods:{ realmEff:1, realmConv:0.35, realmPress:2, realmTech:0 }, // defaults, per-world override in RS.mods
  flags:{ keepQoL:false, autoPress:false, multiBuy:true, autohive:false, extraWorldSlot:false, formatQoL:false },
  settings:{ autosave:true, reducedMotion:false, numFormat:'eng', FX:1, sfx:true, music:false, musicUrl:'' },
  debug:{ enabled:false, prodLock:false, slowSwarm:1.0 },
  lastSave: Date.now(),
  lastSavedText:'—',
  dirty:false,
  stats:{ clicks:0 },
  snapshot:null,
  // Forest-specific resources
  forestResources: { resin: 0, amber: 0 },
  forestTotals: { resin: 0, amber: 0 },
};

function makeCombBoard(){ const W=7,H=5; const board=[]; for(let y=0;y<H;y++){ const row=[]; for(let x=0;x<W;x++){ row.push('empty'); } board.push(row);} return {W,H,cells:board}; }
function initHives(){ if(state.hives.length) return; state.hives.push({ core:true, level:1, capacity:150, stored:0, role:{workers:5,builders:2,nurses:1}, eff:1, adjCap:0.20, tree:{}, board:makeCombBoard(), bees:8 }); }
initHives();

/* ====== Per-world Classic state ====== */
function ensureClassicState(wk){
  if(!state.classicStates[wk]){
    const gens = Object.fromEntries((CLASSIC_WORLD_GEN_DEFS[wk]||[]).map(g=>[g.key,{level:0,boost:0}]));
    state.classicStates[wk] = { gens };
  }
  return state.classicStates[wk];
}

/* ====== Realm state ====== */
function ensureRealmState(worldKey){
  if(!state.realmStates[worldKey]){
    const set=REALM.resourceSets[worldKey];
    const res=Object.fromEntries(Object.keys(set).map(k=>[k,0]));
    const tot=Object.fromEntries(Object.keys(set).map(k=>[k,0]));
    const gens=Object.fromEntries((REALM.generators[worldKey]||[]).map(g=>[g.key,{level:0,boost:0}]));
    state.realmStates[worldKey]={ resources:res, totals:tot, gens, mods:{ realmEff:1, realmConv:0.35, realmPress:2, realmTech:0 } };
  }
  return state.realmStates[worldKey];
}
