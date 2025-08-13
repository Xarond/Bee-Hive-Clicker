'use strict';

/* ================= Helpers ================= */
let RNG_SEED = META.rngSeed; function rng(){ let x = RNG_SEED |= 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; RNG_SEED = x; return (x>>>0)/4294967296; }
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fmt(n){
  const mode = state.settings.numFormat;
  if(!isFinite(n)) return '∞';
  if(mode==='plain') return Number(n).toLocaleString();
  if(mode==='sci'){
    const s=Number(n); if(Math.abs(s)<1000) return s.toFixed(2);
    const e=Math.floor(Math.log10(Math.abs(s))); const m=s/Math.pow(10,e);
    return m.toFixed(2)+'e'+(e>=0?'+':'')+e;
  }
  const abs=Math.abs(n); if(abs<1000) return (Math.round(n*100)/100).toString();
  const U=['','K','M','B','T','aa','ab','ac','ad','ae','af']; let u=0,x=abs; while(x>=1000&&u<U.length-1){x/=1000;u++;} return (n<0?'-':'')+x.toFixed(2)+U[u];
}
const el=q=>document.querySelector(q); const els=q=>Array.from(document.querySelectorAll(q));
const div=(cls,html='')=>{ const d=document.createElement('div'); if(cls) d.className=cls; d.innerHTML=html; return d; }
function nowHMS(){ const t=new Date(); return t.toTimeString().slice(0,8); }
function toast(msg,bad){ const chip=div('chip',msg); chip.style.position='fixed'; chip.style.left='50%'; chip.style.top='10px'; chip.style.transform='translateX(-50%)'; chip.style.zIndex='60'; chip.style.background=bad?'#331a1a':'#16231a'; document.body.appendChild(chip); setTimeout(()=>chip.remove(),2200); }


/* ================= Audio ================= */
let audioEl = null;
const SILENT_MP3 = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
function setupMusic(){ 
  audioEl = document.getElementById('bgm'); 
  if (!audioEl) {
    console.warn('Audio element not found, music disabled');
    return;
  }
  const url = state.settings.musicUrl || SILENT_MP3; 
  audioEl.src = url; 
}
async function updateMusicToggle(forceFlip){ if(forceFlip!==false) state.settings.music=!state.settings.music; if(state.settings.music){ try{ await audioEl.play(); }catch(e){ toast('Autoplay blocked — toggle Music again after a click.', true); state.settings.music=false; el('#musicToggle').checked=false; } } else { audioEl.pause(); } }

/* ================= Save / Load ================= */
function b64enc(u){ let s=''; for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
function b64dec(str){ const s=atob(str); const u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
function xorStream(bytes, seed=0xBEE5){ let x=seed>>>0; const out=new Uint8Array(bytes.length); for(let i=0;i<bytes.length;i++){ x^=x<<13; x^=x>>>17; x^=x<<5; const r=(x>>>0)&0xFF; out[i]=bytes[i]^r; } return out; }
function encSave(str){ const te=new TextEncoder(); const data=te.encode(str); const enc=xorStream(data, 0xBEE51CE2); return b64enc(enc); }
function decSave(b64){ const dec=xorStream(b64dec(b64), 0xBEE51CE2); return new TextDecoder().decode(dec); }
function checksum(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); } return (h>>>0).toString(16); }
function serialize(){ const data=JSON.stringify(state); const sum=checksum(data); return encSave(JSON.stringify({checksum:sum,payload:data,ver:META.version})); }
function deserialize(str){ try{ const raw=decSave(str); const obj=JSON.parse(raw); if(!obj||!obj.payload) return null; const ok=(checksum(obj.payload)===obj.checksum); return {ok,data:JSON.parse(obj.payload)}; }catch(e){ return null; } }
function markDirty(){ state.dirty=true; const s=el('#saveStatus'); s.textContent='Unsaved…'; s.style.background='#261f0b'; }
function saveNow(manual=false){ if(!state.settings.autosave && !manual) return; try{ localStorage.setItem(META.saveKey, serialize()); state.dirty=false; state.lastSavedText='Saved '+nowHMS(); const s=el('#saveStatus'); s.textContent=state.lastSavedText; s.style.background='#132018'; setTimeout(()=>{ s.style.background=''; },900); }catch(e){ console.error(e); toast('Save failed',true); } }
function loadSave(){ const s=localStorage.getItem(META.saveKey); if(!s) return false; const d=deserialize(s); if(!d||!d.data) return false; Object.assign(state, state, d.data); initHives(); return true; }

/* ================= Achievements (subset, czyste) ================= */
let ACH=[];
function generateAchievements(){
  const scales=[10,25,50,100,250,500,1000,2500,5000,1e4,2.5e4,5e4,1e5];
  scales.forEach(v=>ACH.push({key:'click'+v,name:`Clicker ${v}`,desc:`Make ${v} clicks.`,check:s=>s.stats.clicks>=v,apply:s=>{s.mods.clickBase+=0.1},buff:'+0.1 click'}));
  scales.forEach(v=>ACH.push({key:'honey'+v,name:`Sweet ${v}`,desc:`Reach ${v} total Honey.`,check:s=>s.totals.honey>=v,apply:s=>{s.mods.globalMulti*=1.005},buff:'+0.5% global'}));
  [2,3,4,5,6,8,10].forEach(v=>ACH.push({key:'hives'+v,name:`Apiary ${v}`,desc:`Own ${v} hives.`,check:s=>s.hives.length>=v,apply:s=>{s.mods.storage*=1.02},buff:'+2% storage'}));
}
function openAchievements(){ const d=el('#achievementsModal'); const body=el('#achievementsBody'); body.innerHTML=''; ACH.forEach(a=>{ const unlocked=!!state.ach[a.key]; const row=div('upg'); const status=unlocked?'<span class="chip good">Unlocked</span>':'<span class="chip">Locked</span>'; row.innerHTML=`<div><b>${a.name}</b><div class="muted">${a.desc} • Buff: ${a.buff||'—'}</div></div><div>${status}</div>`; body.appendChild(row); }); d.showModal(); }
function checkAchievements(){ let changed=false; ACH.forEach(a=>{ if(state.ach[a.key]) return; try{ if(a.check(state)){ state.ach[a.key]=true; a.apply&&a.apply(state); changed=true; } }catch(_){} }); if(changed){ toast('Achievement unlocked!'); refreshAll(); saveNow(true); } }

/* ================= Visuals: swarm ================= */
const beesSvg = document.getElementById('bees');
const combSvg = document.getElementById('honeycombs');
const vis={ cells:[], built:0, targetCells:12, width:800 };
function hexPath(cx,cy,r){ let d=''; for(let i=0;i<6;i++){ const a=Math.PI/3*i + Math.PI/6; const x=cx + r*Math.cos(a); const y=cy + r*Math.sin(a); d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' '; } return d+'Z'; }
function measureSwarm(){ const vb = el('#swarm').getBoundingClientRect(); vis.width = Math.max(320, vb.width); }
function gridPos(i){ const r=14, col=Math.max(6, Math.floor(vis.width/(r*1.75))); const x=i%col, y=Math.floor(i/col); const ox= (vis.width - col*r*1.75)/2 + r; const oy= 60; const cx = ox + x*r*1.75 + (y%2? r*0.9:0); const cy = oy + y*r*1.55; return {cx,cy,r}; }
function ensureCells(n){ while(vis.cells.length<n){ const i=vis.cells.length; const {cx,cy,r}=gridPos(i); const path=document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d', hexPath(cx,cy,r)); path.setAttribute('stroke','#2a3246'); path.setAttribute('fill','none'); path.setAttribute('opacity','0.9'); combSvg.appendChild(path); vis.cells.push({path,progress:0}); } }
function builderBeesDesired(){
  if(state.realm==='classic'){
    const CS = ensureClassicState(state.worldKey);
    let base = Object.values(CS.gens).reduce((a,b)=>a+(b.level||0),0);
    return Math.max(0, Math.min(80, base));
  }else{
    const RS = ensureRealmState(state.worldKey);
    let sum = Object.values(RS.gens).reduce((a,b)=>a+(b.level||0),0);
    return Math.max(0, Math.min(80, sum));
  }
}
function initBees(){
  beesSvg.innerHTML='';
  const count=builderBeesDesired();
  for(let i=0;i<count;i++){
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('r', String(1.8 + Math.floor(rng()*2)));
    c.setAttribute('fill','#ffd166');
    c.setAttribute('filter','url(#glow)');
    c.dataset.vx=(rng()-.5)*0.12; c.dataset.vy=(rng()-.5)*0.12;
    c.setAttribute('cx', vis.width/2 + (rng()-.5)*40);
    c.setAttribute('cy', 180 + (rng()-.5)*30);
    beesSvg.appendChild(c);
  }
}
function buildRate(){
  let base=0.35;
  const genSum = (state.realm==='classic')
    ? Object.values(ensureClassicState(state.worldKey).gens).reduce((a,b)=>a+(b.level||0),0)
    : Object.values(ensureRealmState(state.worldKey).gens).reduce((a,b)=>a+(b.level||0),0);
  const honey = (state.resources.honey||0);
  base += Math.log10(1+genSum) * 0.18;
  base += Math.log10(1+honey) * 0.05;
  return base;
}
function updateCombs(dt){
  vis.targetCells = Math.min(300, Math.floor(8 + Math.log2(1 + (state.totals.honey||0)) * 6));
  ensureCells(vis.targetCells);
  const r = buildRate() * dt;
  for(let i=0;i<vis.cells.length;i++){
    const cell=vis.cells[i]; if(cell.progress>=1) continue;
    cell.progress = Math.min(1, cell.progress + r);
    const f=cell.progress;
    if(f>=1){ cell.path.setAttribute('fill','url(#honeyGrad)'); cell.path.setAttribute('stroke','#fcbf49'); particleBurst('#swarm',6,false); }
    else { cell.path.setAttribute('fill','none'); cell.path.setAttribute('stroke','#2a3246'); cell.path.setAttribute('stroke-dasharray', (1-f)*90 + ' 999'); }
    break; // jedna naraz
  }
}
function animBees(){
  const targets = vis.cells.filter(c=>c.progress<1);
  const first = targets[0];
  const m = first ? first.path.getPointAtLength(0) : {x: vis.width/2, y: 180};
  beesSvg.childNodes.forEach((c,i)=>{
    let x = parseFloat(c.getAttribute('cx')|| (vis.width/2));
    let y = parseFloat(c.getAttribute('cy')|| (180));
    const ax=(m.x-x)*0.0012*state.debug.slowSwarm, ay=(m.y-y)*0.0012*state.debug.slowSwarm;
    let vx = (+c.dataset.vx)+ax, vy = (+c.dataset.vy)+ay;
    vx = clamp(vx,-0.35,0.35); vy = clamp(vy,-0.35,0.35);
    x += vx*14; y += vy*14;
    c.dataset.vx=vx; c.dataset.vy=vy;
    c.setAttribute('cx',String(x)); c.setAttribute('cy',String(y));
  });
}
window.addEventListener('resize',()=>{ measureSwarm(); vis.cells.forEach((c,i)=>{ const p=gridPos(i); c.path.setAttribute('d', hexPath(p.cx,p.cy,p.r)); }); });

/* ================= Rates / Ticks ================= */
function addClassic(k, amt){
  if(amt===0) return;
  if(k === 'resin' || k === 'amber') {
    // Resin and Amber are Forest-specific
    if(state.worldKey === 'forest') {
      state.forestResources[k] = (state.forestResources[k] || 0) + amt;
      state.forestTotals[k] = (state.forestTotals[k] || 0) + Math.max(0, amt);
      markDirty();
    }
    return;
  }
  if(!(k in state.resources)) state.resources[k]=0;
  state.resources[k]+=amt;
  if(k in state.totals) state.totals[k]+=Math.max(0,amt);
  markDirty();
}
function addRealm(w,k,amt){
  if(amt===0) return;
  const R=ensureRealmState(w);
  R.resources[k]=(R.resources[k]||0)+amt;
  R.totals[k]=(R.totals[k]||0)+Math.max(0,amt);
  markDirty();
}

function currentPressLevelClassic(){
  const CS = ensureClassicState(state.worldKey);
  if(state.worldKey==='forest') return CS.gens.forestPress?.level||0;
  return CS.gens.press?.level||0;
}
function currentResinBoostClassic(){
  if(state.worldKey!=='forest') return {lvl:0, needPerNectar:0};
  const CS = ensureClassicState('forest');
  const lvl = CS.gens.resinFilter?.level||0;
  const needPerNectar = 0.02 * lvl; // 0.02 resin na 1 nectar przy pełnym boost
  return {lvl, needPerNectar};
}

function ratesClassic(){
  const CS = ensureClassicState(state.worldKey);
  // produkcja podstawowa
  let nectarProd=0, honeyGain=0, pollenGain=0, waxGain=0, rjGain=0, propGain=0, resinGain=0, amberGain=0;
  if(state.worldKey==='meadow'){
    const wlv=CS.gens.worker?.level||0, flv=CS.gens.forager?.level||0;
    nectarProd += wlv*1 + flv*4;
    pollenGain += (CS.gens.nursery?.level||0)*0.2;
    waxGain   += (CS.gens.waxer?.level||0)*0.15;
    rjGain    += (CS.gens.rjvat?.level||0)*0.01;
    propGain  += (CS.gens.propol?.level||0)*0.05;
    const pressUse = state.mods.pressCap*(CS.gens.press?.level||0);
    const honeyConv = Math.min(pressUse, (state.resources.nectar||0)+nectarProd) * state.mods.convEff;
    honeyGain += honeyConv;
    nectarProd -= Math.min(pressUse, nectarProd);
  }else{
    const scout=CS.gens.scout?.level||0, tap=CS.gens.tapperF?.level||0, fpress=CS.gens.forestPress?.level||0;
    nectarProd += scout*3;
    resinGain  += tap*0.8;
    amberGain  += (CS.gens.amberMiner?.level||0) * 0.1 * (1 + (CS.gens.amberMiner?.boost||0));
    // waxer forest
    const fwax = CS.gens.forestWaxer?.level||0;
    const resinNeed = 0.3*fwax;
    const resinAvail = Math.max(0,(state.forestResources.resin||0));
    const resinUse = Math.min(resinNeed, resinAvail);
    waxGain += 0.2*fwax;
    
    // Amber Forge processing
    const amberForge = CS.gens.amberForge?.level||0;
    if(amberForge > 0) {
      const amberNeeded = 0.5 * amberForge;
      const amberAvailable = state.forestResources.amber || 0;
      const amberUsed = Math.min(amberNeeded, amberAvailable);
      // Amber Forge gives powerful buffs (calculated in tickClassic)
      // Consumes amber
      amberGain -= amberUsed;
    }
    // press+resin
    const pressUse = state.mods.pressCap * fpress;
    const nectarAvail = (state.resources.nectar||0)+nectarProd;
    const used = Math.min(pressUse, nectarAvail);
    const {lvl,needPerNectar}=currentResinBoostClassic();
    const needRes = needPerNectar * used;
    const haveRes = Math.max(0, (state.forestResources.resin||0)-resinUse); // po forestWaxer
    const useRes = Math.min(needRes, haveRes);
    const fuel = needRes>0? (useRes/needRes):1; // 0..1
    const convEff = state.mods.convEff * (1 + 0.02*lvl*fuel);
    honeyGain += used * convEff;
    nectarProd -= Math.min(pressUse, nectarProd);
  }
  return { nectar: nectarProd, honey:honeyGain, pollen:pollenGain, wax:waxGain, royalJelly:rjGain, propolis:propGain, resin:resinGain, amber:amberGain };
}

function tickClassic(dt){
  const CS = ensureClassicState(state.worldKey);
  // podstawowa produkcja
  if(state.worldKey==='meadow'){
    const wlv=CS.gens.worker?.level||0, flv=CS.gens.forager?.level||0;
    addClassic('nectar', (wlv*1 + flv*4) * dt);
    addClassic('pollen', (CS.gens.nursery?.level||0) * 0.2 * dt);
    addClassic('wax', (CS.gens.waxer?.level||0) * 0.15 * dt);
    addClassic('royalJelly', (CS.gens.rjvat?.level||0) * 0.01 * dt);
    addClassic('propolis', (CS.gens.propol?.level||0) * 0.05 * dt);
    // prasa
    const pressCap = state.mods.pressCap * (CS.gens.press?.level||0) * dt;
    const avail = state.resources.nectar||0;
    const used = Math.min(pressCap, avail);
    state.resources.nectar = avail - used;
    addClassic('honey', used * state.mods.convEff);
  } else {
    // Forest
    addClassic('nectar', (CS.gens.scout?.level||0) * 3 * dt);
    addClassic('resin',  (CS.gens.tapperF?.level||0) * 0.8 * dt);
    addClassic('amber',  (CS.gens.amberMiner?.level||0) * 0.1 * (1 + (CS.gens.amberMiner?.boost||0)) * dt);
    
    // Amber Forge processing
    const amberForge = CS.gens.amberForge?.level||0;
    if(amberForge > 0) {
      const amberNeeded = 0.5 * amberForge * dt;
      const amberAvailable = state.forestResources.amber || 0;
      const amberUsed = Math.min(amberNeeded, amberAvailable);
      if(amberUsed > 0) {
        state.forestResources.amber -= amberUsed;
        // Amber Forge gives powerful buffs
        const boost = 1 + (CS.gens.amberForge?.boost||0);
        state.mods.globalMulti *= (1 + 0.001 * amberUsed * 100 * boost); // +0.1% per amber used
        state.mods.clickBase += 0.01 * amberUsed * 100 * boost; // +1 click per amber used
      }
    }
    
    // Forest Waxer
    const fw=CS.gens.forestWaxer?.level||0;
    if(fw>0){
      const need=0.3*fw*dt;
      const take=Math.min(need, state.forestResources.resin||0);
      state.forestResources.resin=(state.forestResources.resin||0)-take;
      addClassic('wax', 0.2*fw*dt);
    }
    // Press + Resin Filter
    const pressCap = state.mods.pressCap * (CS.gens.forestPress?.level||0) * dt;
    const nectarAvail = state.resources.nectar||0;
    const used = Math.min(pressCap, nectarAvail);
    // Resin boost
    const {lvl,needPerNectar}=currentResinBoostClassic();
    const needRes = needPerNectar * used;
    const haveRes = state.forestResources.resin||0;
    const useRes  = Math.min(needRes, haveRes);
    if(useRes>0) state.forestResources.resin -= useRes;
    const fuel = needRes>0? (useRes/needRes):1;
    const eff = state.mods.convEff * (1 + 0.02*lvl*fuel);
    state.resources.nectar = nectarAvail - used;
    addClassic('honey', used * eff);
  }
}

function ratesRealm(){
  const RS = ensureRealmState(state.worldKey);
  const set = REALM.resourceSets[state.worldKey];
  const out = {}; Object.keys(set).forEach(k=>out[k]=0);
  (REALM.generators[state.worldKey]||[]).forEach(g=>{
    const lvl=RS.gens[g.key]?.level||0; if(!lvl) return;
    const eff=(RS.mods?.realmEff||1);
    (g.produces||[]).forEach(p=>{
      const boost = 1 + (RS.gens[g.key]?.boost||0);
      out[p.k]+= p.r*lvl*boost*eff;
    });
    (g.consumes||[]).forEach(c=> out[c.k]-= c.r*lvl );
    if(g.key==='press' && RS.resources['mycel']!==undefined){
      const press=(RS.mods?.realmPress ?? state.realmMods.realmPress);
      const conv =(RS.mods?.realmConv  ?? state.realmMods.realmConv);
      out['mycel']-= press*lvl;
      out['spore']+= press*lvl*conv;
    }
  });
  return out;
}

function tickRealm(dt){
  const w=state.worldKey; const RS=ensureRealmState(w);
  const eff=(RS.mods?.realmEff||1);
  const press=(RS.mods?.realmPress ?? state.realmMods.realmPress);
  const conv=(RS.mods?.realmConv  ?? state.realmMods.realmConv);
  (REALM.generators[w]||[]).forEach(g=>{
    const lvl=RS.gens[g.key]?.level||0; if(!lvl) return;
    (g.produces||[]).forEach(p=> addRealm(w,p.k, p.r * lvl * eff * dt));
    (g.consumes||[]).forEach(c=>{ const need=c.r*lvl*dt; RS.resources[c.k]=Math.max(0, RS.resources[c.k]-need); });
    if(g.key==='press' && RS.resources['mycel']!==undefined){
      const cap = press*lvl*dt;
      const take=Math.min(cap, RS.resources.mycel);
      RS.resources.mycel-=take; addRealm(w,'spore', take*conv);
    }
  });
}


/* ================= Mixed-cost helpers ================= */
function canAfford(cost){ for(const [k,v] of Object.entries(cost||{})){ if((state.resources[k]||0) < v) return false; } return true; }
function payCost(cost){ for(const [k,v] of Object.entries(cost||{})){ state.resources[k]=(state.resources[k]||0)-v; } markDirty(); }
function canAffordMixed(cost){
  for(const [k,v] of Object.entries(cost||{})){
    if(k in state.resources){ if((state.resources[k]||0) < v) return false; continue; }
    const RS = ensureRealmState(state.worldKey);
    if(!RS || RS.resources[k]==null || RS.resources[k] < v) return false;
  }
  return true;
}
function payCostMixed(cost){
  for(const [k,v] of Object.entries(cost||{})){
    if(k in state.resources){ state.resources[k]-=v; continue; }
    const RS = ensureRealmState(state.worldKey); RS.resources[k]-=v;
  }
  markDirty();
}

/* ================= UI: Upgrades & Research ================= */
function resNameForKey(k){
  if(CLASSIC.resources[k]) return CLASSIC.resources[k].name;
  const set=REALM.resourceSets[state.worldKey]; if(set && set[k]) return set[k].name;
  return k;
}
function renderResearchList(host){
  // active
  if(state.researchActive){
    const node = RESEARCH.find(n=>n.id===state.researchActive.id);
    const p = clamp((Date.now()-state.researchActive.start)/(state.researchActive.dur*1000),0,1);
    const row = div('upg',
      `<div>
        <b>Researching: ${node?.name||state.researchActive.id}</b>
        <div class="muted"><span id="researchPct">${Math.round(p*100)}%</span></div>
        <div class="progress"><div class="fill" id="researchFill" style="width:${Math.round(p*100)}%"></div></div>
      </div>
      <div><button class="small" id="cancelResearch">Cancel</button></div>`
    );
    row.querySelector('#cancelResearch').onclick=()=>{ state.researchActive=null; refreshAll(); };
    host.appendChild(row);
    return;
  }
  // list
  RESEARCH.forEach(node=>{
    if(state.research[node.id]) return;
    const ok = node.prereq.every(p=>!!state.research[p]);
    const costStr = Object.entries(node.cost||{}).map(([k,v])=>`${fmt(v)} ${resNameForKey(k)}`).join(', ');
    const line=div('upg'+(ok?'':' locked'),
      `<div><b>${node.name}</b><div class="muted">${node.desc}${!ok?` • Requires: ${node.prereq.join(', ')}`:''}</div><div class="muted">Time: ${node.time||6}s</div></div>
       <div><div class="roi">Cost: ${costStr||'—'}</div><button class="small"${ok?'':' disabled'}>Research</button></div>`);
    const btn=line.querySelector('button');
    btn.onclick=()=>{
      if(!canAffordMixed(node.cost||{})) return toast('Not enough resources',true);
      payCostMixed(node.cost||{});
      state.researchActive={ id:node.id, start:Date.now(), dur:node.time||6 };
      saveNow(true); refreshAll();
    };
    host.appendChild(line);
  });
}
function tickResearch(){
  if(!state.researchActive) return;
  const {id,start,dur}=state.researchActive;
  if(Date.now()-start >= dur*1000){
    const node = RESEARCH.find(n=>n.id===id);
    state.research[id]=true;
    node && node.on && node.on(state);
    state.researchActive=null;
    toast('Research complete: '+(node?.name||id));
    initBees(); refreshAll(); saveNow(true);
  }
}
function bindTabs(){
  const all = UPGRADE_TABS;
  els('.tab').forEach(b=>{
    b.onclick=()=>{
      els('.tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tab=b.dataset.tab;
      all.forEach(t=>{ 
        const box = el('#upg-'+t); 
        if(box) box.hidden = (t!==tab);
      });
      renderUpgrades();
    };
  });
  const first = els('.tab').find(x=>x.dataset.tab===UPGRADE_TABS[0]) || els('.tab')[0];
  if(first){
    first.click();
  }
}



function renderUpgrades(){
  const tabs=UPGRADE_TABS;
  
  // Find which tab is currently visible
  let activeTab = null;
  for(let t of tabs) {
    const host = el('#upg-'+t);
    if(host && !host.hidden) {
      activeTab = t;
      break;
    }
  }
  
  if(!activeTab) {
    activeTab = tabs[0];
    // Show first tab by default
    tabs.forEach(t=>{
      const box = el('#upg-'+t);
      if(box) box.hidden = (t !== activeTab);
    });
  }
  
  // Only render the active tab
  const host = el('#upg-'+activeTab);
  if(!host) {
    return;
  }
  
  host.innerHTML='';
  
  if(activeTab==='research'){ 
    if(!state.research.lab){ // show lab first if missing
      const fakeHost = host;
      renderResearchList(fakeHost);
    } else {
      renderResearchList(host);
    }
    return;
  }
  
  if(activeTab==='global' || activeTab==='hive' || activeTab==='transmute' || activeTab==='ap'){
    let upgrades = (UPGRADES[activeTab]||[]);
    
    upgrades.forEach(u=>{
      if(state.upgrades[u.k]) return;
      if(u.req && !u.req(state)) return;
      const costStr=Object.entries(u.cost||{}).map(([k,v])=>`${fmt(v)} ${resNameForKey(k)}`).join(', ');
      const line=div('upg',
        `<div><b>${u.name}</b><div class="muted">${u.desc}</div></div>
         <div><div class="roi">Cost: ${costStr||'—'}</div><button class="small">Buy</button></div>`);
      line.querySelector('button').onclick=()=>{
        if(activeTab==='ap'){
          const need = u.ap||0; if(state.ap<need) return toast(`Need ${need} AP`,true);
          state.ap -= need; state.apSpent += need; u.effect && u.effect(state); state.upgrades[u.k]=true; particleBurst('#swarm',8,false); refreshAll(); saveNow(true);
          return;
        }
        if(!canAfford(u.cost||{})) return toast('Not enough resources',true);
        payCost(u.cost||{}); u.effect&&u.effect(state); u.onBuy&&u.onBuy(state); state.upgrades[u.k]=true; particleBurst('#swarm',8,false); refreshAll(); saveNow(true);
      };
      host.appendChild(line);
    });
    return;
  }
  
  if(activeTab==='world'){
    let list=[];
    if(state.realm==='classic'){
      list = (WORLD_UPGRADES.classic[state.worldKey]||[]);
    }else{
      list = (WORLD_UPGRADES.realm[state.worldKey]||[]);
    }
    if(list.length===0){ host.appendChild(div('muted','No upgrades in this world.')); return; }
    
    list.forEach(u=>{
      if(state.upgrades[u.k]) return;
      const costStr=Object.entries(u.cost||{}).map(([k,v])=>`${fmt(v)} ${resNameForKey(k)}`).join(', ');
      const line=div('upg',`<div><b>${u.name}</b><div class="muted">${u.desc}</div></div><div><div class="roi">Cost: ${costStr||'—'}</div><button class="small">Buy</button></div>`);
      line.querySelector('button').onclick=()=>{
        if(!canAffordMixed(u.cost||{})) return toast('Not enough resources',true);
        payCostMixed(u.cost||{}); u.effect&&u.effect(state); state.upgrades[u.k]=true; particleBurst('#swarm',8,false); refreshAll(); saveNow(true);
      };
      host.appendChild(line);
    });
    return;
  }
  
  if(activeTab==='generator'){
    let list = state.realm==='classic' ? (GEN_UPGRADES_CLASSIC[state.worldKey]||[]) : (GEN_UPGRADES_REALM[state.worldKey]||[]);
    if(list.length===0){ host.appendChild(div('muted','No generator upgrades here.')); return; }
    
    list.forEach(u=>{
      if(state.upgrades[u.k]) return;
      const costStr=Object.entries(u.cost||{}).map(([k,v])=>`${fmt(v)} ${resNameForKey(k)}`).join(', ');
      const line=div('upg',`<div><b>${u.name}</b><div class="muted">${u.desc}</div></div><div><div class="roi">Cost: ${costStr||'—'}</div><button class="small">Buy</button></div>`);
      line.querySelector('button').onclick=()=>{
        if(!canAffordMixed(u.cost||{})) return toast('Not enough resources',true);
        payCostMixed(u.cost||{}); u.effect&&u.effect(state); state.upgrades[u.k]=true; particleBurst('#swarm',8,false); refreshAll(); saveNow(true);
      };
      host.appendChild(line);
    });
    return;
  }
}

/* ================= Worlds UI ================= */
function realmPrimaryResourceKey(wk){ const set = REALM.resourceSets[wk]; return set ? Object.keys(set)[0] : null; }
function realmPrimaryResourceName(wk){ const set = REALM.resourceSets[wk]; const k = realmPrimaryResourceKey(wk); return set && k ? set[k].name : 'Resource'; }
function updateClickerTitle(){
  if(state.realm === 'classic'){
    el('#clickerTitle').innerHTML = 'Giant Flower <span class="sub">Click to gather <b>Nectar</b></span>';
  } else {
    const nm = realmPrimaryResourceName(state.worldKey);
    el('#clickerTitle').innerHTML = 'Realm Gathering <span class="sub">Click to gather <b>'+nm+'</b></span>';
  }
}
function updateFlowerVariant(){
  const w=[...CLASSIC.worlds,...REALM.worlds].find(x=>x.key===state.worldKey);
  if(!w) return;
  const petGrad=el('#petalGrad'); petGrad.children[0].setAttribute('stop-color', w.flower? w.flower[0] : '#6fcf97'); petGrad.children[1].setAttribute('stop-color', w.flower? w.flower[1] : '#2a9d8f');
  el('#flower').style.borderColor = w.tint;
}

function worldUnlockInfo(w){ return `Requires ${w.unlock?.achCount||0} achievements • Costs ${w.unlock?.purchaseAP||0} AP`; }
function renderWorldBrowser(){
  const body = el('#worldsBody');
  body.innerHTML = '';
  const worlds=[...CLASSIC.worlds, ...REALM.worlds];

  // Gate Starlight until two others are purchased
  const allowStar = !!(state.purchasedWorlds.grotto && state.purchasedWorlds.clock);

  worlds.forEach(w=>{
    if(w.key==='starlight' && !allowStar) return;
    const unlocked = (w.unlock?.achCount||0) <= Object.values(state.ach).filter(Boolean).length;
    const purchased = !!state.purchasedWorlds[w.key];

    const row = div('upg');
    row.innerHTML = `
      <div>
        <b>${w.name}</b> ${w.realm==='realm'?'<span class="muted">(Realm)</span>':''}
        <div class="muted">${unlocked ? (purchased?'Purchased':'Available') : 'Locked'} • ${worldUnlockInfo(w)}</div>
      </div>
      <div>
        ${!unlocked ? '<button class="small" disabled>Locked</button>' :
          (!purchased ? `<button class="small accent" data-a="buy">Purchase (${w.unlock?.purchaseAP||0} AP)</button>` :
            '<button class="small good" data-a="enter">Enter</button>')}
      </div>
    `;

    const buyBtn = row.querySelector('[data-a="buy"]');
    if(buyBtn) buyBtn.onclick = ()=>{
      const cost=w.unlock?.purchaseAP||0;
      if(state.ap<cost){ toast(`Need ${cost} AP`, true); return; }
      state.ap-=cost; state.purchasedWorlds[w.key]=true; markDirty(); refreshTop(); renderWorldBrowser(); saveNow(true);
      toast(`${w.name} purchased!`);
    };

    const enterBtn = row.querySelector('[data-a="enter"]');
    if(enterBtn) enterBtn.onclick = ()=>{
      state.worldKey=w.key;
      state.realm=(w.realm==='realm')?'realm':'classic';
      if(state.realm==='realm') ensureRealmState(w.key); else ensureClassicState(w.key);
      updateFlowerVariant(); measureSwarm(); initBees(); refreshAll(); saveNow(true);
      el('#worldsModal').close();
      toast(`Entered ${w.name}`);
    };

    body.appendChild(row);
  });
}
function openWorlds(){ renderWorldBrowser(); el('#worldsModal').showModal(); }

/* ================= Resource bars ================= */
function throttle(fn,ms){ let t=0; return ()=>{ const n=performance.now(); if(n-t>ms){ t=n; fn(); } } }
function setClassicResVisible(show){
  el('#classicRes').style.display = show? 'inline-flex':'none';
  el('#worldCurrencyChip').hidden = show;
  const alt = el('#altRes');
  if(show){ alt.style.display='none'; alt.innerHTML=''; }
  
  // If showing classic resources, handle world-specific currency visibility
  if(show && state.realm === 'classic') {
    const isForest = state.worldKey === 'forest';
    
    // Hide/show Meadow currencies based on world
    baseResClassic.forEach(k => {
      const el = document.querySelector(`[data-k="${k}"]`);
      if(el) {
        el.style.display = isForest ? 'none' : 'inline-flex';
      }
    });
    
    // Show Forest currencies only in Forest world
    const resinEl = document.querySelector('[data-k="resin"]');
    const amberEl = document.querySelector('[data-k="amber"]');
    
    if(resinEl) {
      resinEl.style.display = isForest ? 'inline-flex' : 'none';
    }
    if(amberEl) {
      amberEl.style.display = isForest ? 'inline-flex' : 'none';
    }
  }
}
function renderAltResourceChips(worldKey){
  const wrap=el('#altRes'); 
  wrap.innerHTML='';
  if(state.realm!=='realm') { wrap.style.display='none'; return; }
  wrap.style.display='inline-flex';
  const set=REALM.resourceSets[worldKey]; if(!set) return;
  const R = state.realmStates[worldKey]; const rates = ratesRealm();
  Object.entries(set).forEach(([k,def])=>{
    const chip=document.createElement('div'); chip.className='chip';
    const rate = fmt(rates[k]||0)+'/s';
    chip.setAttribute('data-tip', `${def.name}\nHow to get: realm generators.\nUse: world mechanics, research.`);
    chip.innerHTML=`<span class="icon">${def.icon||'•'}</span><span>${def.name}:</span> <b class="mono" id="alt-${k}">${fmt((R?.resources?.[k])||0)}</b> <small class="muted">(+${rate})</small>`;
    wrap.appendChild(chip);
  });
}
function refreshTop(){
  el('#ap').textContent=fmt(state.ap); el('#ec').textContent=fmt(state.ec);

  if(state.realm==='classic'){
    setClassicResVisible(true);
    
    // Update Meadow currency values
    baseResClassic.forEach(k=>{ const n=el('#'+k); if(n) n.textContent=fmt(state.resources[k]||0); });
    
    // Update Forest currency values
    if(state.worldKey === 'forest') {
      const resinEl = el('#resin');
      if(resinEl) {
        resinEl.textContent = `Resin: ${fmt(state.forestResources.resin||0)}`;
      }
      const amberEl = el('#amber');
      if(amberEl) {
        amberEl.textContent = `Amber: ${fmt(state.forestResources.amber||0)}`;
      }
    }
    
    const rr = ratesClassic();
    el('#nectarRate').textContent = `(+${fmt(rr.nectar)}/s)`;
    el('#honeyRate').textContent = `(+${fmt(rr.honey)}/s)`;
    
    // Show rates for Forest currencies
    if(state.worldKey === 'forest') {
      const amberRateEl = el('#amberRate');
      if(amberRateEl) {
        amberRateEl.textContent = `(+${fmt(rr.amber)}/s)`;
      }
      const resinRateEl = el('#resinRate');
      if(resinRateEl) {
        resinRateEl.textContent = `(+${fmt(rr.resin)}/s)`;
      }
    }
    el('#pressInfo').style.display='inline-flex';
    el('#clickInfo').style.display='inline-flex';
  } else {
    setClassicResVisible(false);
    renderAltResourceChips(state.worldKey);
    el('#pressInfo').style.display='none';
    el('#clickInfo').style.display='inline-flex';
  }

  updateClickerTitle();
  el('#flower').disabled=false;

  el('#clickGain').textContent = fmt(state.mods.clickBase * state.mods.globalMulti);
  el('#critInfo').textContent = 'Crit '+Math.round(state.mods.critChance*100)+'%';
  el('#convEff').textContent = Math.round(state.mods.convEff*100)+'%';
  const cs = ensureClassicState(state.worldKey);
  const pressLv = currentPressLevelClassic();
  el('#pressCap').textContent = fmt(state.mods.pressCap * pressLv)+'/s';
  el('#version').textContent='v'+META.version;
}
const refreshTopThrottled = throttle(()=>{ refreshTop(); if(state.realm==='realm') renderAltResourceChips(state.worldKey); }, 150);
function refreshAll(){
  refreshTop();
  refreshGenerators();
  renderUpgrades();
  refreshResearchProgressUI();
}

/* ================= Shop / Generators ================= */
function totalGeneratorsOwned(){
  if(state.realm==='classic') return Object.values(ensureClassicState(state.worldKey).gens).reduce((a,g)=>a+(g.level||0),0);
  const RS=ensureRealmState(state.worldKey); return Object.values(RS.gens).reduce((a,g)=>a+(g.level||0),0);
}
function refreshGenerators(){
  const list=el('#generatorList'); list.innerHTML='';
  const qtySel = el('#shop .qtyGroup .selected')?.dataset.qty || (state.flags.multiBuy?'10':'1');

  if(state.realm==='classic'){
    const defs = CLASSIC_WORLD_GEN_DEFS[state.worldKey]||[];
    const CS = ensureClassicState(state.worldKey);
    defs.forEach(def=>{
      const have=CS.gens[def.key]?.level||0;
      const multQty = qtySel==='max'?'max':(parseInt(qtySel)||1);
      const nextCost = def.baseCost * Math.pow(def.mult, have);
      const cost = Math.round(nextCost * (multQty==='max'? 5: multQty));
      const line=div('shopline');
      line.appendChild(div('name', `${def.name} <span class="muted">Lv ${have}</span>`));
      const out=(def.produces||[]).map(p=>`${fmt(p.r*have)}/s ${resNameForKey(p.k)}`).join(' • ');
      const cons=(def.consumes||[]).map(c=>`${fmt(c.r*have)}/s ${resNameForKey(c.k)}`).join(' • ');
      const extras = def.special==='press' || def.special==='pressForest' ? 'Adds Press capacity' :
                     def.special==='resinBoost' ? 'Boosts Press conversion using Resin' : '';
      const info=div('', `<div class="muted">${def.flavor}</div><div class="muted">${out?('Produces: '+out):''}${cons?(' • Consumes: '+cons):''}${extras?(' • '+extras):''}</div>`);
      const buyBtn=document.createElement('button');
      buyBtn.textContent=`Buy ${multQty==='max'?'Max':'x'+multQty} — Cost Honey: ${fmt(cost)}`;
      buyBtn.onclick=()=>{
        if((state.resources.honey||0)>=cost){
          addClassic('honey', -cost);
          CS.gens[def.key].level += (multQty==='max'? 1: multQty);
          if(def.key==='worker' || def.key==='scout') initBees();
          particleBurst('#swarm',6,false);
          refreshAll();
        } else toast('Not enough Honey',true);
      };
      line.appendChild(info); line.appendChild(buyBtn); list.appendChild(line);
    });
  } else {
    const w=state.worldKey; const R=REALM.generators[w]||[]; const RS=ensureRealmState(w);
    R.forEach(g=>{
      const have=RS.gens[g.key]?.level||0;
      const multQty = qtySel==='max'?'max':(parseInt(qtySel)||1);
      const nextCost = g.baseCost * Math.pow(g.costMult, have);
      const payKey=(g.consumes && g.consumes[0] ? g.consumes[0].k : realmPrimaryResourceKey(w));
      const cost=Math.round(nextCost * (multQty==='max'? 5: multQty));
      const line=div('shopline'); line.appendChild(div('name', `${g.name} <span class="muted">Lv ${have}</span>`));
      const out=(g.produces||[]).map(p=>`${fmt(p.r*have)}/s ${resNameForKey(p.k)}`).join(' • ');
      const consumes=(g.consumes||[]).map(c=>resNameForKey(c.k)).join(', ')||'—';
      const info=div('', `<div class="muted">${g.flavor}</div><div class="muted">Produces: ${out||'—'} • Consumes: ${consumes}</div>`);
      const buyBtn=document.createElement('button'); buyBtn.textContent=`Buy ${multQty==='max'?'Max':'x'+multQty} — Cost ${resNameForKey(payKey)}: ${fmt(cost)}`;
      buyBtn.onclick=()=>{
        if((RS.resources[payKey]||0) < cost){ toast('Not enough resources',true); return; }
        RS.resources[payKey]-=cost; RS.gens[g.key].level += (multQty==='max'? 1: multQty); markDirty(); particleBurst('#swarm',6,false); refreshAll();
      };
      line.appendChild(info); line.appendChild(buyBtn); list.appendChild(line);
    });
  }
}
els('#shop .qtyGroup button').forEach(b=>{
  b.onclick=()=>{ els('#shop .qtyGroup button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); refreshGenerators(); };
});
(els('#shop .qtyGroup button')[0]||{}).classList?.add('selected'); // x10 default

/* ================= Particles & Click ================= */
function particleBurst(sel,count,force=false){
  if(state.settings.reducedMotion) return;
  if(!force && totalGeneratorsOwned()===0) return;
  const host=document.querySelector(sel);
  const r=host.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.left=(r.left + r.width/2)+'px';
    p.style.top=(r.top + r.height/2)+'px';
    p.style.background=['#ffd166','#f77f00','#06d6a0','#4cc9f0'][i%4];
    document.body.appendChild(p);
    const dx=(rng()-.5)*200, dy=(rng()-.5)*120;
    const life=600+Math.random()*600;
    p.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:life,easing:'ease-out'}).onfinish=()=>p.remove();
  }
}
function clickGainNow(){
  const base = state.mods.clickBase * state.mods.globalMulti;
  const crit = (rng()<state.mods.critChance);
  const gain = base * (crit?state.mods.critMult:1);
  if(state.realm==='classic'){
    return {gain,crit,resKey:'nectar'};
  } else {
    const resKey = realmPrimaryResourceKey(state.worldKey);
    const rgain = gain * (state.realmMods.realmEff || 1);
    return {gain:rgain,crit,resKey};
  }
}

/* ================= Hives (minimal manager) ================= */
function makeCombBoard(){ const W=7,H=5; const board=[]; for(let y=0;y<H;y++){ const row=[]; for(let x=0;x<W;x++){ row.push('empty'); } board.push(row);} return {W,H,cells:board}; } // (dup safe)
function openHives(){
  const d=el('#hivesModal');
  const body=el('#hivesBody');
  body.innerHTML='';
  state.hives.forEach((h,i)=>{
    const row=div('upg');
    const controls=`
      <div class="row wrap" style="gap:6px">
        <span class="chip">Bees: <b>${fmt(h.bees||0)}</b> / Cap ${fmt(h.capacity)}</span>
        <span class="chip">Workers: <b>${h.role.workers||0}</b></span>
        <button class="small" data-a="w-">−</button><button class="small" data-a="w+">+</button>
        <span class="chip">Builders: <b>${h.role.builders||0}</b></span>
        <button class="small" data-a="b-">−</button><button class="small" data-a="b+">+</button>
        <span class="chip">Nurses: <b>${h.role.nurses||0}</b></span>
        <button class="small" data-a="n-">−</button><button class="small" data-a="n+">+</button>
      </div>
      <div class="row wrap" style="gap:6px;margin-top:6px">
        <button class="small good" data-a="breed">Breed 1 (20 Nectar + 10 Pollen)</button>
        <button class="small" data-a="cap">+50 Cap (5 Wax + 100 Honey)</button>
        <button class="small" data-a="eff">+5% Eff (1 RJ + 300 Honey)</button>
      </div>
    `;
    row.innerHTML = `<div>
        <b>${h.core?'Core Hive':'Hive '+(i)}</b>
        <div class="muted">Lv ${h.level} • Eff ${Math.round((h.eff||1)*100)}%</div>
        ${controls}
      </div>`;
    const bind=(sel,fn)=> row.querySelector(sel).onclick = ()=>{ fn(); refreshAll(); openHives(); };
    bind('[data-a="w+"]',()=>{ h.role.workers=(h.role.workers||0)+1; });
    bind('[data-a="w-"]',()=>{ h.role.workers=Math.max(0,(h.role.workers||0)-1); });
    bind('[data-a="b+"]',()=>{ h.role.builders=(h.role.builders||0)+1; initBees(); });
    bind('[data-a="b-"]',()=>{ h.role.builders=Math.max(0,(h.role.builders||0)-1); initBees(); });
    bind('[data-a="n+"]',()=>{ h.role.nurses=(h.role.nurses||0)+1; });
    bind('[data-a="n-"]',()=>{ h.role.nurses=Math.max(0,(h.role.nurses||0)-1); });
    bind('[data-a="breed"]',()=>{ if(state.resources.nectar>=20 && state.resources.pollen>=10 && (h.bees||0)<h.capacity){
      addClassic('nectar',-20); addClassic('pollen',-10); h.bees=(h.bees||0)+1; initBees(); } else toast('Need 20 Nectar & 10 Pollen and capacity',true); });
    bind('[data-a="cap"]',()=>{ if(state.resources.wax<5||state.resources.honey<100){ toast('Need 5 Wax & 100 Honey',true); return; } addClassic('wax',-5); addClassic('honey',-100); h.capacity+=50; });
    bind('[data-a="eff"]',()=>{ if(state.resources.royalJelly<1||state.resources.honey<300){ toast('Need 1 Royal Jelly & 300 Honey',true); return; } addClassic('royalJelly',-1); addClassic('honey',-300); h.eff*=1.05; });
    body.appendChild(row);
  });
  el('#hiveCost').textContent='Buy: 250 Honey + 10 Wax';
  el('#btnBuyHive').onclick=()=>{
    if(state.resources.honey<250||state.resources.wax<10){ toast('Not enough (250H + 10W)',true); return; }
    addClassic('honey',-250); addClassic('wax',-10);
    state.hives.push({ level:1, capacity:120, stored:0, role:{workers:2,builders:1,nurses:0}, eff:1, board:makeCombBoard(), bees:3 });
    refreshAll(); initBees();
  };
  d.showModal();
}

/* ================= Ascension & Coronation ================= */
function potentialAP(){ const base = state.totals.honey||0; return Math.floor(Math.pow(base/1000, DIFFICULTY.apExp)); }
function openAscend(){
  const ap = potentialAP();
  el('#ascendBody').innerHTML=`<p>You will gain <b>${ap}</b> AP based on total Honey (${fmt(state.totals.honey||0)}).</p>
  <p>Ascension resets classic resources, classic generators and most upgrades. Keeps worlds, research, and AP upgrades.</p>`;
  el('#ascendModal').showModal();
}
function doAscend(){
  const ap = potentialAP();
  state.ap += ap;
  baseResClassic.forEach(k=>{ state.resources[k]=0; });
  baseResClassic.forEach(k=>{ if(k!=='honey') state.totals[k]=0; });
  // reset classic per-world gens
  state.classicStates = { meadow:null, forest:null };
  ensureClassicState('meadow');
  state.upgrades={};
  state.hives=[{ core:true, level:1, capacity:150, stored:0, role:{workers:5,builders:2,nurses:1}, eff:1, adjCap:0.20, tree:{}, board:makeCombBoard(), bees:8 }];
  toast(`Ascended! +${ap} AP`);
  updateFlowerVariant(); initBees();
  refreshAll(); saveNow(true);
  el('#ascendModal').close();
}
function openCoronation(){
  const crowns = Math.floor(state.apSpent/50);
  el('#coronationBody').innerHTML = `<p>Convert spent AP into Elder Crowns at 1 per 50 AP spent.</p>
  <p>Available now: <b>${crowns}</b> EC. Each EC grants +1% global permanently.</p>`;
  el('#coronationModal').showModal();
}
function doCoronation(){
  const crowns = Math.floor(state.apSpent/50);
  if(crowns<=0){ toast('Not enough spent AP',true); return; }
  state.ec += crowns;
  state.mods.globalMulti *= Math.pow(1.01, crowns);
  state.apSpent -= crowns*50;
  toast(`Crowned: +${crowns} EC`);
  refreshAll(); saveNow(true);
  el('#coronationModal').close();
}

/* ================= Settings & Debug ================= */

function setupUI(){
  // Clicker
  el('#flower').addEventListener('click', ()=>{
    const {gain,crit,resKey} = clickGainNow();
    if(state.realm==='classic'){
      addClassic('nectar', gain);
    } else {
      if(resKey) addRealm(state.worldKey, resKey, gain);
    }
    state.stats.clicks++;
    particleBurst('#swarm', crit?16:6, false);
    refreshTop(); checkAchievements();
  });

  // Settings & save
  el('#btnSettings').onclick=()=>{ el('#settingsModal').showModal(); el('#ioArea').value=serialize(); el('#musicUrl').value = state.settings.musicUrl||''; };
  el('#btnSetMusic').onclick=()=>{ const u=el('#musicUrl').value.trim(); if(!u){ toast('Paste a MP3/WAV URL',true); return; } state.settings.musicUrl=u; setupMusic(); toast('Music URL set. Toggle Music to (re)play.'); saveNow(true); };
  el('#btnExport').onclick=()=>{ const blob=new Blob([serialize()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='beehive-save.bee'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); };
  el('#btnExport2').onclick=()=>{ el('#ioArea').value=serialize(); toast('Save copied to the box'); };
  el('#btnImport').onclick=()=>{ el('#fileImport').click(); };
  el('#fileImport').addEventListener('change', async (e)=>{ const f=e.target.files[0]; if(!f) return; const text=await f.text(); importSaveFromText(text); e.target.value=''; });
  el('#btnImport2').onclick=()=>{ const txt=el('#ioArea').value.trim(); importSaveFromText(txt); };
  function importSaveFromText(txt){ const d=deserialize(txt); if(!d){ toast('Invalid or corrupted save',true); return; } Object.assign(state, state, d.data); initHives(); updateFlowerVariant(); initBees(); refreshAll(); saveNow(true); toast('Save imported!'); }
  el('#btnWipe').onclick=()=>{ if(!confirm('Wipe save?')) return; localStorage.removeItem(META.saveKey); location.reload(); };
  el('#btnSnapshot').onclick=()=>{ state.snapshot=serialize(); toast('Snapshot taken'); };
  el('#btnRestore').onclick=()=>{ if(!state.snapshot){ toast('No snapshot',true); return; } const d=deserialize(state.snapshot); if(d&&d.data){ Object.assign(state, state, d.data); refreshAll(); saveNow(true); toast('Snapshot restored'); } };

  // Modals
  el('#btnAchievements').onclick=openAchievements;
  el('#btnHives').onclick=openHives;
  el('#btnNotes').onclick=()=>el('#notesModal').showModal();
  el('#btnAscend').onclick=openAscend;
  el('#confirmAscend').onclick=doAscend;
  el('#btnCoronate').onclick=openCoronation;
  el('#confirmCoronation').onclick=doCoronation;
  el('#btnWorlds').onclick=openWorlds;

  // Toggles
  el('#autosaveToggle').onchange=(e)=>{ state.settings.autosave=e.target.checked; if(e.target.checked) saveNow(true); };
  el('#motionToggle').onchange=(e)=>{ state.settings.reducedMotion=e.target.checked; };
  el('#numFormat').onchange=(e)=>{ state.settings.numFormat=e.target.value; refreshTop(); };
  el('#fxLevel').onchange=(e)=>{ state.settings.FX=parseInt(e.target.value); initBees(); };
  el('#sfxToggle').onchange=(e)=>{};
  el('#musicToggle').onchange=(e)=>{ if(e.target.checked!==state.settings.music) updateMusicToggle(true); else updateMusicToggle(false); };

  // Tabs
  bindTabs();

  // Secret debug opener
  let keyBuffer=''; window.addEventListener('keydown', (ev)=>{ keyBuffer = (keyBuffer + ev.key.toLowerCase()).slice(-8); if(keyBuffer.includes('buzzbuzz')){ el('#dbgWatermark').style.display='block'; el('#btnDebug').style.display='inline-flex'; toast('Debug on'); } });
  el('#btnDebug').onclick=openDebug;
}
function setupMusic(){ 
  audioEl = document.getElementById('bgm'); 
  if (!audioEl) {
    console.warn('Audio element not found, music disabled');
    return;
  }
  const url = state.settings.musicUrl || SILENT_MP3; 
  audioEl.src = url; 
}
async function updateMusicToggle(forceFlip){ 
  if(forceFlip!==false) state.settings.music = !state.settings.music; 
  if(!audioEl) return;
  if(state.settings.music){ 
    try{ await audioEl.play(); }catch(e){ toast('Autoplay blocked — toggle Music again after a click.', true); state.settings.music=false; el('#musicToggle').checked=false; } 
  } else { 
    audioEl.pause(); 
  } 
}

function openDebug(){
  const d=el('#debugModal');
  const body=el('#debugBody');
  body.innerHTML='';

  const row=(label,btns)=>{ const r=div('row wrap'); r.style.gap='8px'; r.appendChild(div('chip', `<b>${label}</b>`)); btns.forEach(b=>r.appendChild(b)); body.appendChild(r); };
  const mk=(txt,fn)=>{ const b=document.createElement('button'); b.className='small'; b.textContent=txt; b.onclick=fn; return b; };

  row('Resources',[
    mk('+1K Honey',()=>{ addClassic('honey',1000); refreshAll(); }),
    mk('+1K Nectar',()=>{ addClassic('nectar',1000); refreshAll(); }),
    mk('+100 Resin',()=>{ addClassic('resin',100); refreshAll(); }),
    mk('+100 Pollen',()=>{ addClassic('pollen',100); refreshAll(); }),
    mk('+10 RJ',()=>{ addClassic('royalJelly',10); refreshAll(); })
  ]);
  row('AP / EC',[
    mk('+10 AP',()=>{ state.ap+=10; refreshTop(); }),
    mk('Spend 50 AP',()=>{ if(state.ap>=50){ state.ap-=50; } state.apSpent+=50; refreshTop(); })
  ]);
  row('Worlds',[
    mk('Unlock/purchase all',()=>{ [...CLASSIC.worlds,...REALM.worlds].forEach(w=>state.purchasedWorlds[w.key]=true); }),
    mk('Enter Forest',()=>{ state.purchasedWorlds.forest=true; state.worldKey='forest'; state.realm='classic'; ensureClassicState('forest'); updateFlowerVariant(); refreshAll(); })
  ]);
  row('Ticks',[
    mk('x1',()=>{ state.mods.tickMult=1; }),
    mk('x2',()=>{ state.mods.tickMult=2; }),
    mk('x5',()=>{ state.mods.tickMult=5; })
  ]);
  row('Research',[
    mk('Unlock Lab',()=>{ state.research.lab=true; refreshAll(); }),
    mk('All research',()=>{ RESEARCH.forEach(n=>{ state.research[n.id]=true; n.on&&n.on(state); }); refreshAll(); })
  ]);
  row('Achievements',[
    mk('Unlock all',()=>{ ACH.forEach(a=>{ state.ach[a.key]=true; a.apply&&a.apply(state); }); refreshAll(); saveNow(true); toast('All achievements unlocked!'); })
  ]);
  row('Swarm',[
    mk('Slower',()=>{ state.debug.slowSwarm=0.7; }),
    mk('Normal',()=>{ state.debug.slowSwarm=1.0; }),
    mk('Faster',()=>{ state.debug.slowSwarm=1.5; }),
    mk('Recount Bees',()=>{ initBees(); })
  ]);

  d.showModal();
}

/* ================= Game loop & init ================= */
function refreshResearchProgressUI(){
  if(!state.researchActive) return;
  const pct = clamp((Date.now()-state.researchActive.start)/(state.researchActive.dur*1000),0,1);
  const f = document.getElementById('researchFill');
  const t = document.getElementById('researchPct');
  if(f) f.style.width = Math.round(pct*100)+'%';
  if(t) t.textContent = Math.round(pct*100)+'%';
}
let last=performance.now();
function gameLoop(ts){
  const dt=Math.min(0.25, (ts - last)/1000)*state.mods.tickMult; last=ts;
  animBees(); updateCombs(dt);
  if(state.realm==='classic') tickClassic(dt); else tickRealm(dt);
  tickResearch();
  refreshResearchProgressUI();
  refreshTopThrottled();
  requestAnimationFrame(gameLoop);
}

/* ================= Offline gain ================= */
function simulateOffline(seconds){
  const cap=(state.realm==='classic'?META.offlineCapHoursClassic:META.offlineCapHoursRealm)*3600;
  const s=Math.min(seconds, cap);
  for(let t=0;t<s;t+=0.05){
    if(state.realm==='classic') tickClassic(0.05); else tickRealm(0.05);
  }
  refreshAll();
}
function doOfflineCalc(){
  const now=Date.now();
  const elapsed=(now - state.lastSave)/1000;
  if(elapsed>0) simulateOffline(elapsed);
  state.lastSave=now;
}

/* ================= Boot ================= */
function generateAchievementsSafe(){ ACH=[]; generateAchievements(); }
function init(){
  generateAchievementsSafe();
  measureSwarm();
  setupMusic();
  loadSave();
  ensureClassicState(state.worldKey);
  setupUI();
  updateFlowerVariant();
  updateClickerTitle();
  initBees();
  doOfflineCalc();
  refreshAll();
  requestAnimationFrame(gameLoop);

  // Autosave every 20s
  setInterval(()=>{ if(state.settings.autosave){ saveNow(false); state.lastSave=Date.now(); } }, 20000);
  setInterval(()=>refreshGenerators(), 1600);
}

init();

