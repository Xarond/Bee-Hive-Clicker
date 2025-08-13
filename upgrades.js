'use strict';
const UPGRADE_TABS=['global','world','hive','generator','transmute','research','ap'];
/* ================= Upgrades / Research / AP ================= */
const UPGRADES = {
  global:[
    {k:'g_click1',name:'Stronger Clicks',desc:'+1 click power',cost:{honey:50},effect:s=>s.mods.clickBase+=1},
    {k:'g_press1',name:'Bigger Press',desc:'+1 press cap',cost:{honey:120},effect:s=>s.mods.pressCap+=1},
    {k:'g_conv1',name:'Copper Filters',desc:'+5% conversion',cost:{honey:200},effect:s=>s.mods.convEff+=0.05},
    {k:'g_crit1',name:'Lucky Bees',desc:'+2% crit chance',cost:{honey:300},effect:s=>s.mods.critChance+=0.02},
    {k:'g_global1',name:'Golden Jars',desc:'+10% global',cost:{honey:800,pollen:5},effect:s=>s.mods.globalMulti*=1.10},
    {k:'g_conv2',name:'Silver Filters',desc:'+10% conversion',cost:{honey:2200,wax:10},effect:s=>s.mods.convEff+=0.10, req:s=>Object.keys(state.upgrades).length>=4},
  ],
  hive:[
    {k:'h_cap1',name:'Wider Combs',desc:'+50 hive capacity',cost:{wax:10,honey:100},effect:s=>s.hives.forEach(h=>h.capacity+=50)},
    {k:'h_eff1',name:'Queen Discipline',desc:'+5% hive efficiency',cost:{royalJelly:1,honey:500},effect:s=>s.hives.forEach(h=>h.eff*=1.05)},
    {k:'h_role1',name:'Train Builders',desc:'+1 Builder per hive',cost:{pollen:15,honey:400},effect:s=>s.hives.forEach(h=>h.role.builders=(h.role.builders||0)+1)},
  ],
  transmute:[
    {k:'t_p2n',name:'Spin Pollen → Nectar',desc:'Convert 1 Pollen → 50 Nectar',cost:{pollen:1},onBuy:s=>{ addClassic('nectar',50); }},
    {k:'t_w2h',name:'Melt Wax → Honey',desc:'Convert 1 Wax → 120 Honey',cost:{wax:1},onBuy:s=>{ addClassic('honey',120); }},
  ],
  research:[], // renderowane osobno
  ap:[
    {k:'ap_click', name:'AP: Click Might', desc:'+1 click permanently', ap:2, effect:s=>s.mods.clickBase+=1},
    {k:'ap_global', name:'AP: Global +5%', desc:'+5% global permanently', ap:3, effect:s=>s.mods.globalMulti*=1.05},
    {k:'ap_press', name:'AP: +1 press cap', desc:'+1 press cap permanently', ap:2, effect:s=>s.mods.pressCap+=1},
  ],
};

/* Generator upgrades: pełne listy */
const GEN_UPGRADES_CLASSIC = {
  meadow: [
    {k:'x_worker1', name:'Pollen Boots (Worker)', desc:'+25% worker output', cost:{honey:120,pollen:5}, effect:s=>{const CS=ensureClassicState('meadow'); CS.gens.worker.boost=(CS.gens.worker.boost||0)+0.25;}},
    {k:'x_forager1', name:'Better Maps (Forager)', desc:'+25% forager output', cost:{honey:300,pollen:8}, effect:s=>{const CS=ensureClassicState('meadow'); CS.gens.forager.boost=(CS.gens.forager.boost||0)+0.25;}},
    {k:'x_press1', name:'Hot Plates (Press)', desc:'+10% conversion', cost:{honey:600,wax:6}, effect:s=>{s.mods.convEff+=0.10;}},
    {k:'x_nursery1', name:'Incubation Lamps (Nursery)', desc:'+25% Nursery output', cost:{honey:1000,pollen:30}, effect:s=>{const CS=ensureClassicState('meadow'); CS.gens.nursery.boost=(CS.gens.nursery.boost||0)+0.25;}},
  ],
  forest: [
    {k:'x_scout1', name:'Trail Guides (Scout)', desc:'+25% Scout output', cost:{honey:280,pollen:8}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.scout.boost=(CS.gens.scout.boost||0)+0.25;}},
    {k:'x_tapperF1', name:'Wide Spiles (Tapper)', desc:'+20% Resin output', cost:{honey:260}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.tapperF.boost=(CS.gens.tapperF.boost||0)+0.20;}},
    {k:'x_resinf1', name:'Finer Mesh (Resin Filter)', desc:'+1% extra conversion / level', cost:{resin:30,honey:700}, effect:s=>{/* bonus w mechanice, lvl już działa */}},
          {k:'x_fwax1', name:'Hot Molds (Forest Waxer)', desc:'+15% Wax output', cost:{resin:40,honey:900}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.forestWaxer.boost=(CS.gens.forestWaxer.boost||0)+0.15;}},
      {k:'x_amber1', name:'Crystal Picks (Amber Miner)', desc:'+20% Amber output', cost:{amber:20,honey:1200}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.amberMiner.boost=(CS.gens.amberMiner.boost||0)+0.20;}},
      {k:'x_amberForge1', name:'Ancient Runes (Amber Forge)', desc:'+15% Amber Forge efficiency', cost:{amber:40,honey:1500}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.amberForge.boost=(CS.gens.amberForge.boost||0)+0.15;}},
  ],
};

const GEN_UPGRADES_REALM = {
  grotto: [
    {k:'rx_sporeling1', name:'Hardened Spores', desc:'+20% Sporeling output', cost:{mycel:120}, effect:s=>{const RS=ensureRealmState('grotto'); RS.gens.sporeling.boost=(RS.gens.sporeling.boost||0)+0.20;}},
    {k:'rx_glow1', name:'Reflective Mats', desc:'+15% Glowkeeper output', cost:{mycel:80,glow:40}, effect:s=>{const RS=ensureRealmState('grotto'); RS.gens.glowkeeper.boost=(RS.gens.glowkeeper.boost||0)+0.15;}},
    {k:'rx_fiber1', name:'Reinforced Webbing', desc:'+10% Weaver output', cost:{fiber:60,glow:60}, effect:s=>{const RS=ensureRealmState('grotto'); RS.gens.weaver.boost=(RS.gens.weaver.boost||0)+0.10;}},
  ],
  clock: [
    {k:'rx_tapper1', name:'Wide Taps', desc:'+20% Tree Tapper output', cost:{sap:140}, effect:s=>{const RS=ensureRealmState('clock'); RS.gens.tapper.boost=(RS.gens.tapper.boost||0)+0.20;}},
    {k:'rx_gearling1', name:'Balanced Teeth', desc:'+15% Gearling output', cost:{cog:80,sap:60}, effect:s=>{const RS=ensureRealmState('clock'); RS.gens.gearling.boost=(RS.gens.gearling.boost||0)+0.15;}},
    {k:'rx_smelter1', name:'Insulated Furnaces', desc:'+15% Smelter output', cost:{alloy:40,sap:80}, effect:s=>{const RS=ensureRealmState('clock'); RS.gens.smelter.boost=(RS.gens.smelter.boost||0)+0.15;}},
  ],
  starlight: [
    {k:'rx_sifter1', name:'Fine Sieves', desc:'+20% Star Sifter output', cost:{dust:160}, effect:s=>{const RS=ensureRealmState('starlight'); RS.gens.sifter.boost=(RS.gens.sifter.boost||0)+0.20;}},
    {k:'rx_lumenor1', name:'Polished Mirrors', desc:'+15% Lumenor output', cost:{lumen:60,dust:80}, effect:s=>{const RS=ensureRealmState('starlight'); RS.gens.lumenor.boost=(RS.gens.lumenor.boost||0)+0.15;}},
    {k:'rx_prism1', name:'Prismatic Cutters', desc:'+10% Prism Cutter output', cost:{prism:20,dust:100}, effect:s=>{const RS=ensureRealmState('starlight'); RS.gens.prismcut.boost=(RS.gens.prismcut.boost||0)+0.10;}},
  ],
};

const WORLD_UPGRADES = {
  classic: {
    meadow: [
      {k:'w_meadow1', name:'Meadow Richness', desc:'+25% nectar (Meadow)', cost:{honey:250,pollen:10}, effect:s=>{/*click buff*/ s.mods.clickBase+=0.5;}},
      {k:'w_meadow2', name:'Sunny Bloom', desc:'+5% global (Meadow)', cost:{honey:900,wax:10}, effect:s=>{s.mods.globalMulti*=1.05;}},
      {k:'w_meadow3', name:'Prosperous Grounds', desc:'+10% global (Meadow)', cost:{honey:1800,pollen:25}, effect:s=>{s.mods.globalMulti*=1.10;}},
      {k:'w_meadow4', name:'Press Springs', desc:'+1 Press cap (global)', cost:{wax:12,honey:1400}, effect:s=>{s.mods.pressCap+=1;}},
    ],
    forest: [
      {k:'w_forest1', name:'Forest Saps', desc:'+10% global (Forest)', cost:{honey:800,wax:10}, effect:s=>{s.mods.globalMulti*=1.10;}},
      {k:'w_forest2', name:'Resin Guides', desc:'+1 Press cap (Forest)', cost:{honey:1200,pollen:20}, effect:s=>{/* global cap OK */ s.mods.pressCap+=1;}},
      {k:'w_forest3', name:'Forager Trails', desc:'+25% Scout output', cost:{honey:1500,pollen:20}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.scout.boost=(CS.gens.scout.boost||0)+0.25;}},
      {k:'w_forest4', name:'Sticky Frames', desc:'+15% Forest Wax output', cost:{honey:1600,wax:8}, effect:s=>{const CS=ensureClassicState('forest'); CS.gens.forestWaxer.boost=(CS.gens.forestWaxer.boost||0)+0.15;}},
      {k:'w_forest5', name:'Refined Filters', desc:'+10% Resin Filter efficacy', cost:{resin:80,honey:1800}, effect:s=>{/* lepszy bonus: +0.5%/lvl globalnie */ s.mods.convEff+=0.005;}},
      {k:'w_forest6', name:'Amber Resonance', desc:'+25% Amber Forge efficiency', cost:{amber:50,honey:2500}, effect:s=>{/* bonus w mechanice */}},
    ],
  },
  realm: {
    grotto: [
      {k:'rw_grotto_gather1', name:'Grotto Workforce I', desc:'+25% Sporeling output', cost:{mycel:100,glow:20}, effect:s=>{ const RS=ensureRealmState('grotto'); RS.gens.sporeling.boost=(RS.gens.sporeling.boost||0)+0.25; }},
      {k:'rw_grotto2', name:'Biolum Lattices', desc:'+10% Realm Efficiency (Grotto)', cost:{glow:120,fiber:40}, effect:s=>{const R=ensureRealmState('grotto'); R.mods.realmEff=(R.mods.realmEff||1)*1.10;}},
      {k:'rw_grotto3', name:'Firm Hyphae', desc:'-10% Mycelium consumption (press)', cost:{mycel:220}, effect:s=>{const R=ensureRealmState('grotto'); R.mods.realmPress=(R.mods.realmPress||state.realmMods.realmPress)*0.9;}},
    ],
    clock: [
      {k:'rw_clock_gather1', name:'Clock Lubricants', desc:'+25% Tree Tapper output', cost:{sap:150}, effect:s=>{ const RS=ensureRealmState('clock'); RS.gens.tapper.boost=(RS.gens.tapper.boost||0)+0.25; }},
      {k:'rw_clock2', name:'Precision Jigs', desc:'+15% Cog output', cost:{sap:120,cog:60}, effect:s=>{const R=ensureRealmState('clock'); R.gens.gearling.boost=(R.gens.gearling.boost||0)+0.15;}},
      {k:'rw_clock3', name:'Efficient Smelters', desc:'+15% Alloy output', cost:{alloy:40,sap:200}, effect:s=>{const R=ensureRealmState('clock'); R.gens.smelter.boost=(R.gens.smelter.boost||0)+0.15;}},
    ],
    starlight: [
      {k:'rw_star_gather1', name:'Dune Scouts', desc:'+25% Star Sifter output', cost:{dust:200}, effect:s=>{ const RS=ensureRealmState('starlight'); RS.gens.sifter.boost=(RS.gens.sifter.boost||0)+0.25; }},
      {k:'rw_star2', name:'Focused Lenses', desc:'+15% Lumen output', cost:{dust:220,lumen:60}, effect:s=>{const R=ensureRealmState('starlight'); R.gens.lumenor.boost=(R.gens.lumenor.boost||0)+0.15;}},
      {k:'rw_star3', name:'Crystal Geometry', desc:'+10% Realm Efficiency (Starlight)', cost:{prism:20,dust:300}, effect:s=>{const R=ensureRealmState('starlight'); R.mods.realmEff=(R.mods.realmEff||1)*1.10;}},
    ],
  }
};

/* ================= Research ================= */
function hasUpgrades(n){ return Object.keys(state.upgrades).length>=n; }

const RESEARCH = [
  {id:'lab', name:'Tiny Research Lab', desc:'Unlocks research UI and tiered content.', time:6, cost:{pollen:20,honey:800}, prereq:[], on:s=>{s.research.lab=true}},
  {id:'qol', name:'Quality of Life', desc:'Autosave tweaks, number format tools.', time:5, cost:{pollen:40}, prereq:['lab'], on:s=>{s.flags.formatQoL=true}},
  {id:'transmute+', name:'Advanced Transmute', desc:'Adds extra recipes.', time:7, cost:{pollen:80,wax:6}, prereq:['lab'], on:s=>{
    UPGRADES.transmute.push({k:'t_h2w',name:'Condense Honey → Wax',desc:'600 Honey → 5 Wax',cost:{honey:600},onBuy:st=>addClassic('wax',5)});
    UPGRADES.transmute.push({k:'t_r2h',name:'Refine Resin → Honey',desc:'10 Resin → 220 Honey',cost:{resin:10},onBuy:st=>addClassic('honey',220)});
  }},
  // Forest-tech
  {id:'resin_science1', name:'Resin Science I', desc:'+0.5% Press conversion if Resin Filter present', time:8, cost:{pollen:120, honey:1600}, prereq:['lab'], on:s=>{ s.mods.convEff += 0.005; }},
];
