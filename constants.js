'use strict';
/* ================= CONFIG ================= */
const DIFFICULTY = { genCostScale:1.25, startConv:0.35, startPress:3, apExp:0.68 };
const META = { version:'1.6', rngSeed:1337, offlineCapHoursClassic:6, offlineCapHoursRealm:6, saveKey:'beehiveClickerSaveV1_6' };

/* ===== Worlds & Resources ===== */
const CLASSIC = {
  resources:{
    nectar:{name:'Nectar',icon:'🌼'},
    honey:{name:'Honey',icon:'🍯'},
    pollen:{name:'Pollen',icon:'🟡'},
    wax:{name:'Wax',icon:'🕯️'},
    royalJelly:{name:'Royal Jelly',icon:'👑'},
    propolis:{name:'Propolis',icon:'🟤'},
  },
  worlds:[
    { key:'meadow', realm:'classic', name:'Meadow', tint:'#7cb518', flower:['#6fcf97','#2a9d8f'], unlock:{achCount:0, purchaseAP:0}, visible:true },
    { key:'forest', realm:'classic', name:'Forest', tint:'#386641', flower:['#9ccc65','#2e7d32'], unlock:{achCount:10, purchaseAP:2}, visible:true },
  ],
};

const REALM = {
  worlds:[
    { key:'grotto', realm:'realm', name:'Glowshroom Grotto', tint:'#3da35d', flower:['#9cffdd','#39b79a'], currency:'spore', currencyName:'Spore Tokens', unlock:{achCount:20, purchaseAP:5}, visible:true },
    { key:'clock', realm:'realm', name:'Clockwork Orchard', tint:'#b08968', flower:['#ffcc80','#8d6e63'], currency:'cog', currencyName:'Cog Tokens', unlock:{achCount:80, purchaseAP:12}, visible:true },
    { key:'starlight', realm:'realm', name:'Starlight Dunes', tint:'#7b9acc', flower:['#b3c9ff','#7986cb'], currency:'lumen', currencyName:'Lumen Tokens', unlock:{achCount:150, purchaseAP:20}, visible:false },
  ],
  resourceSets:{
    grotto:{ mycel:{name:'Mycelium',icon:'🍄'}, glow:{name:'Glow',icon:'✨'}, spore:{name:'Spores',icon:'🌫️'}, fiber:{name:'Fibrils',icon:'🧵'} },
    clock:{ sap:{name:'Sap Oil',icon:'🟠'}, cog:{name:'Cogs',icon:'⚙️'}, alloy:{name:'Alloy',icon:'🔩'}, plan:{name:'Blueprints',icon:'📘'} },
    starlight:{ dust:{name:'Stardust',icon:'🌟'}, lumen:{name:'Lumen',icon:'💡'}, prism:{name:'Prisms',icon:'🔷'}, ion:{name:'Ions',icon:'🧪'} },
  },
  generators:{
    grotto:[
      { key:'sporeling',   name:'Sporeling',     baseRate:1,   baseCost:12,  costMult:1.17, produces:[{k:'mycel',r:1}], consumes:[], flavor:'Crawls and collects mycelium.' },
      { key:'glowkeeper',  name:'Glowkeeper',    baseRate:0.6, baseCost:40,  costMult:1.2,  produces:[{k:'glow',r:0.5}],  consumes:[{k:'mycel',r:0.2}], flavor:'Turns mycelium into glow.' },
      { key:'weaver',      name:'Weaver Mite',   baseRate:0.3, baseCost:90,  costMult:1.22, produces:[{k:'fiber',r:0.25}],consumes:[{k:'mycel',r:0.2}], flavor:'Spins fibrils for structures.' },
      { key:'alchemist',   name:'Myco Alchemist',baseRate:0,   baseCost:200, costMult:1.25, produces:[], consumes:[{k:'glow',r:0.2},{k:'fiber',r:0.05}], flavor:'Transmutes into multipliers.' },
      { key:'press',       name:'Spore Press',   baseRate:0,   baseCost:60,  costMult:1.2,  produces:[{k:'spore',r:0}],  consumes:[{k:'mycel',r:1}], flavor:'Converts mycelium → spores via Efficiency.' },
    ],
    clock:[
      { key:'tapper',    name:'Tree Tapper', baseRate:1,   baseCost:18,  costMult:1.18, produces:[{k:'sap',r:1}],   consumes:[], flavor:'Collects sap oil.' },
      { key:'gearling',  name:'Gearling',    baseRate:0.5, baseCost:60,  costMult:1.22, produces:[{k:'cog',r:0.5}], consumes:[{k:'sap',r:0.2}], flavor:'Assembles cogs from sap.' },
      { key:'smelter',   name:'Smelter',     baseRate:0.25,baseCost:120, costMult:1.24, produces:[{k:'alloy',r:0.2}],consumes:[{k:'sap',r:0.3}], flavor:'Forges alloy plates.' },
      { key:'drafter',   name:'Drafter',     baseRate:0,   baseCost:220, costMult:1.26, produces:[{k:'plan',r:0.01}],consumes:[{k:'cog',r:0.1}], flavor:'Slow trickle of blueprints.' },
    ],
    starlight:[
      { key:'sifter',    name:'Star Sifter',  baseRate:1,   baseCost:25,  costMult:1.2,  produces:[{k:'dust',r:1}],  consumes:[], flavor:'Sifts stardust.' },
      { key:'lumenor',   name:'Lumenor',      baseRate:0.5, baseCost:80,  costMult:1.22, produces:[{k:'lumen',r:0.5}],consumes:[{k:'dust',r:0.3}], flavor:'Condenses lumen from dust.' },
      { key:'prismcut',  name:'Prism Cutter', baseRate:0.22,baseCost:140, costMult:1.24, produces:[{k:'prism',r:0.2}],consumes:[{k:'dust',r:0.4}], flavor:'Cuts prisms.' },
      { key:'ionizer',   name:'Ionizer',      baseRate:0,   baseCost:260, costMult:1.28, produces:[{k:'ion',r:0.02}],consumes:[{k:'lumen',r:0.2}], flavor:'Ion yields for tech.' },
    ],
  }
};

/* ===== Classic per-world generator defs ===== */
const CLASSIC_WORLD_GEN_DEFS = {
  meadow: [
    { key:'worker',  name:'Worker Bee',  flavor:'Base gatherer.', baseCost:10,  mult:1.15,  produces:[{k:'nectar', r:1}] },
    { key:'forager', name:'Forager Bee', flavor:'Brings lots of nectar.', baseCost:25, mult:1.20, produces:[{k:'nectar', r:4}] },
    { key:'press',   name:'Honey Press', flavor:'Converts Nectar→Honey (cap).', baseCost:40, mult:1.22, special:'press' },
    { key:'nursery', name:'Nursery',     flavor:'A bit of Pollen.', baseCost:120, mult:1.25, produces:[{k:'pollen', r:0.2}] },
    { key:'waxer',   name:'Wax Maker',   flavor:'Honey→Wax.', baseCost:180, mult:1.25, consumes:[{k:'honey', r:2}], produces:[{k:'wax', r:0.15}] },
    { key:'rjvat',   name:'Royal Jelly Vat', flavor:'Very slow RJ.', baseCost:320, mult:1.28, produces:[{k:'royalJelly', r:0.01}] },
    { key:'propol',  name:'Propolis Still',  flavor:'Some Propolis.', baseCost:260, mult:1.26, produces:[{k:'propolis', r:0.05}] },
  ],
  forest: [
    { key:'scout',       name:'Forest Scout',    flavor:'Finds nectar in deep woods.', baseCost:30, mult:1.18, produces:[{k:'nectar', r:3}] },
    { key:'tapperF',     name:'Tree Tapper',     flavor:'Extracts sticky resin.', baseCost:45, mult:1.20, produces:[{k:'resin', r:0.8}] },
    { key:'amberMiner',  name:'Amber Miner',     flavor:'Mines ancient amber from deep forest.', baseCost:120, mult:1.26, produces:[{k:'amber', r:0.1}] },
    { key:'forestPress', name:'Forest Press',    flavor:'Press cap (forest).', baseCost:60, mult:1.22, special:'pressForest' },
    { key:'resinFilter', name:'Resin Filter',    flavor:'Consumes Resin to boost conversion.', baseCost:85, mult:1.24, special:'resinBoost' },
    { key:'forestWaxer', name:'Forest Waxer',    flavor:'Resin→Wax.', baseCost:140, mult:1.25, consumes:[{k:'resin', r:0.3}], produces:[{k:'wax', r:0.2}] },
    { key:'amberForge',  name:'Amber Forge',     flavor:'Converts Amber to powerful buffs.', baseCost:200, mult:1.28, consumes:[{k:'amber', r:0.5}], special:'amberBuff' },
  ],
};
const baseResClassic=['nectar','honey','pollen','wax','royalJelly','propolis'];
