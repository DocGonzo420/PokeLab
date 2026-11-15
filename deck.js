/* Poke Lab Deck Builder.
   Reads the collection Poke Lab already saved in this browser (no re-entry), checks Standard
   legality from deck.json (built by tools/build_deck_data.py), builds a 60-card deck from cards
   you own, lists what's missing, and exports a deck list that Pokemon TCG Live can import.
   Decks are saved in this browser (localStorage). No accounts, no keys. */
(() => {
"use strict";
const P = window.PokeLab;
if (!P) return;
const { Cat, Store, cardImage, esc, norm, normNum, toast, searchCatalogue } = P;
const $ = (s, el = document) => el.querySelector(s);

/* ---------- deck facts (subtypes, types, evolutions, legality) ---------- */
const DD = { ready: false, loading: null, sub: [], byId: new Map(), firstMark: "H" };
function loadDeckData() {
  if (DD.ready) return Promise.resolve();
  if (!DD.loading) DD.loading = fetch("deck.json").then(r => { if (!r.ok) throw new Error("deck data " + r.status); return r.json(); })
    .then(d => { DD.sub = d.subtypes; DD.firstMark = d.firstLegalMark || "H"; for (const r of d.cards) DD.byId.set(r[0], r); DD.ready = true; })
    .catch(e => { DD.loading = null; throw e; });
  return DD.loading;
}
const waitCat = () => new Promise(res => { const t = () => Cat.ready ? res() : setTimeout(t, 150); t(); });

const TYPES = [["G", "Grass"], ["R", "Fire"], ["W", "Water"], ["L", "Lightning"], ["P", "Psychic"], ["F", "Fighting"], ["D", "Darkness"], ["M", "Metal"], ["N", "Dragon"], ["C", "Colorless"]];
const typeName = l => (TYPES.find(t => t[0] === l) || [l, l])[1];
const BASIC_E = { G: "sve-1", R: "sve-2", W: "sve-3", L: "sve-4", P: "sve-5", F: "sve-6", D: "sve-7", M: "sve-8" };

const infoCache = new Map();
function info(id) {
  if (infoCache.has(id)) return infoCache.get(id);
  const cat = Cat.byId.get(id); if (!cat) return null;
  const r = DD.byId.get(id); const mask = r ? r[1] : 0;
  const has = s => { const i = DD.sub.indexOf(s); return i >= 0 && !!(mask & (1 << i)); };
  const kind = cat.supertype === "Pokémon" ? "P" : cat.supertype === "Trainer" ? "T" : "E";
  let basicEnergy = !!(mask & (1 << 30));
  if (!r && kind === "E") basicEnergy = /^(Basic )?(Grass|Fire|Water|Lightning|Psychic|Fighting|Darkness|Metal|Fairy) Energy$/.test(cat.name);
  let types = r ? r[2] : "";
  const o = {
    id, cat, name: cat.name, kind, types, from: r ? r[3] : "", mark: r ? r[4] : "", legal: r ? r[5] : -1, hp: r ? r[6] : 0, cost: r ? (r[7] || "") : "",
    basicEnergy, known: !!r,
    basic: kind === "P" && has("Basic"),
    stage2: has("Stage 2"), stage1: has("Stage 1"),
    ace: has("ACE SPEC"), radiant: has("Radiant"),
    rule: ["ex", "EX", "V", "GX", "VMAX", "VSTAR", "MEGA", "TAG TEAM"].some(has),
    tclass: kind !== "T" ? "" : has("Supporter") ? "Supporter" : has("Stadium") ? "Stadium" : (has("Pokémon Tool") || has("Pokémon Tool F")) ? "Tool" : "Item"
  };
  infoCache.set(id, o); return o;
}
const okIn = (fmt, o) => fmt === "any" || o.legal > 0;
const nameKey = o => o.basicEnergy ? "E:" + o.types : o.name;

/* catalogue by exact name, newest print first */
let byName = null;
function prints(name) {
  if (!byName) {
    byName = new Map();
    for (const c of Cat.cards) { const k = c.name; if (!byName.has(k)) byName.set(k, []); byName.get(k).push(c); }
    for (const l of byName.values()) l.sort((a, b) => String(b.set.released).localeCompare(String(a.set.released)));
  }
  return byName.get(name) || [];
}
/* the newest print you could use in this format (for things you'd need to get) */
function bestPrint(name, fmt) {
  for (const c of prints(name)) { const o = info(c.id); if (o && okIn(fmt, o) && o.known) return o; }
  return null;
}

/* ---------- your collection ---------- */
function owned() {
  const m = new Map();
  for (const c of Store.cards) if (c.cardId) m.set(c.cardId, (m.get(c.cardId) || 0) + (c.qty || 1));
  return m;
}

/* ---------- saved decks (this browser) ---------- */
const KEY = "pokelab-decks";
let decks = [];
let memOnly = false;
function loadDecks() { try { decks = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(decks)) decks = []; } catch (e) { decks = []; memOnly = true; } }
function saveDecks() { try { localStorage.setItem(KEY, JSON.stringify(decks)); } catch (e) { if (!memOnly) { memOnly = true; toast("This browser isn't letting the page save decks."); } } }
const getDeck = id => decks.find(d => d.id === id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function touch(d) { d.updated = Date.now(); saveDecks(); }
function setCount(d, id, n) {
  const i = d.cards.findIndex(x => x.id === id);
  if (n <= 0) { if (i >= 0) d.cards.splice(i, 1); }
  else if (i >= 0) d.cards[i].n = n; else d.cards.push({ id, n });
  touch(d);
}

/* ---------- the auto builder ---------- */
const STAPLES = [
  // [name, copies, kind] common, Standard-legal staples; only used when they fit the format
  ["Buddy-Buddy Poffin", 4], ["Ultra Ball", 4], ["Rare Candy", 4, "stage2"], ["Lillie's Determination", 4],
  ["Boss's Orders", 2], ["Night Stretcher", 2], ["Switch", 2], ["Pokégear 3.0", 2], ["Dawn", 2], ["Hilda", 2],
  ["Poké Pad", 2], ["Energy Retrieval", 1], ["Judge", 1], ["Air Balloon", 1], ["Prime Catcher", 1, "ace"]
];
const TOP_UP = [["Ultra Ball", 4], ["Night Stretcher", 3], ["Switch", 3], ["Boss's Orders", 3], ["Pokégear 3.0", 3], ["Dawn", 3], ["Hilda", 3], ["Poké Pad", 3]];
function lineOf(top, fmt, own) {
  // names from Basic up to top, e.g. ["Charmander","Charmeleon","Charizard ex"]
  const names = [top.name]; let from = top.from; let guard = 0;
  while (from && guard++ < 3) {
    names.unshift(from);
    let pre = null;
    for (const c of prints(from)) { const o = info(c.id); if (o && own.has(c.id)) { pre = o; break; } }
    if (!pre) pre = bestPrint(from, "any");
    from = pre ? pre.from : "";
  }
  return names;
}
function scoreTop(o, fmt, own, ownedNames) {
  const names = lineOf(o, fmt, own);
  const complete = names.every(n => ownedNames.has(n));
  return { names, complete, s: (complete ? 10 : 0) + (o.rule ? 4 : 0) + (names.length - 1) * 1.5 + o.hp / 100 };
}

function autoBuild({ format: fmt, mainId, type }) {
  const own = owned();
  const rows = new Map(); const nameN = new Map(); let total = 0, ace = 0, radiant = 0;
  const pool = [...own.keys()].map(info).filter(o => o && okIn(fmt, o));
  const ownedNames = new Set(pool.map(o => o.name));
  const left = id => (own.get(id) || 0) - (rows.get(id) || 0);
  const room = o => o.basicEnergy ? 99 : 4 - (nameN.get(nameKey(o)) || 0);
  function put(o, n, cap = 60) {
    n = Math.min(n, room(o), cap - total);
    if (o.ace) n = Math.min(n, 1 - ace); if (o.radiant) n = Math.min(n, 1 - radiant);
    if (n <= 0) return 0;
    rows.set(o.id, (rows.get(o.id) || 0) + n); nameN.set(nameKey(o), (nameN.get(nameKey(o)) || 0) + n); total += n;
    if (o.ace) ace += n; if (o.radiant) radiant += n;
    return n;
  }
  // owned copies of a name, preferring one print, then the newest
  function putOwned(name, want, prefer, cap) {
    const list = pool.filter(o => o.name === name).sort((a, b) => (b.id === prefer) - (a.id === prefer) || String(b.cat.set.released).localeCompare(String(a.cat.set.released)));
    let got = 0;
    for (const o of list) { if (got >= want) break; got += put(o, Math.min(want - got, left(o.id)), cap); }
    return got;
  }
  function putNeed(name, want, prefer, cap) {
    const o = (prefer && info(prefer) && info(prefer).name === name && okIn(fmt, info(prefer))) ? info(prefer) : bestPrint(name, fmt);
    return o ? put(o, want, cap) : 0;
  }

  // 1. the main Pokemon
  let main = mainId ? info(mainId) : null;
  if (!main && type) {
    const cands = pool.filter(o => o.kind === "P" && o.types.includes(type)).map(o => ({ o, ...scoreTop(o, fmt, own, ownedNames) })).sort((a, b) => b.s - a.s);
    main = cands.length ? cands[0].o : null;
  }
  if (!main) return null;
  // Energy to play: what the main Pokemon's attacks cost, else its type (Dragon types have no basic Energy)
  const mainTypes = [...new Set((main.cost || main.types.replace("C", "") || (type && type !== "C" ? type : "")).split(""))].filter(t => BASIC_E[t]).join("");
  const fitsType = o => o.types.includes("C") || [...mainTypes].some(t => o.types.includes(t)) || (!!o.cost && [...o.cost].every(t => mainTypes.includes(t)));
  const pokeCap = 18;
  const tmpl = { 1: [4], 2: [4, 3], 3: [4, 2, 3] };
  const mainLine = lineOf(main, fmt, own);
  (tmpl[mainLine.length] || [4, 2, 3]).forEach((want, i) => {
    const name = mainLine[i]; const prefer = i === mainLine.length - 1 ? main.id : null;
    const got = putOwned(name, want, prefer, pokeCap);
    if (got < want) putNeed(name, want - got, prefer, pokeCap);
  });
  // 2. partners you own of the same type (or Colorless), whole lines only
  const pCount = () => [...rows].reduce((s, [id, n]) => s + (info(id).kind === "P" ? n : 0), 0);
  const used = new Set(mainLine);
  const partners = pool.filter(o => o.kind === "P" && !used.has(o.name) && fitsType(o))
    .map(o => ({ o, ...scoreTop(o, fmt, own, ownedNames) })).filter(x => x.complete).sort((a, b) => b.s - a.s);
  for (const p of partners) {
    if (pCount() >= 14) break;
    if (p.names.some(n => used.has(n) && n !== p.names[0])) continue;
    if (used.has(p.o.name)) continue;
    const t = p.names.length === 1 ? [2] : p.names.length === 2 ? [2, 2] : [2, 1, 2];
    p.names.forEach((n, i) => { putOwned(n, t[i], i === p.names.length - 1 ? p.o.id : null, pokeCap); used.add(n); });
  }
  // 3. Trainers you own: staples first, then the rest
  const energyWant = mainLine.length === 3 ? 10 : 12;
  const trainerCap = 60 - Math.max(0, mainTypes ? energyWant : 4);
  const hasStage2 = [...rows].some(([id]) => info(id).stage2);
  const staples = STAPLES.filter(s => s[2] !== "stage2" || hasStage2);
  for (const [name, n] of staples) putOwned(name, n, null, trainerCap);
  const fits = o => o.name !== "Rare Candy" || hasStage2;
  const tOwned = pool.filter(o => o.kind === "T" && !rows.has(o.id) && fits(o))
    .sort((a, b) => ({ Supporter: 0, Item: 1, Tool: 2, Stadium: 3 }[a.tclass] - { Supporter: 0, Item: 1, Tool: 2, Stadium: 3 }[b.tclass]));
  let stadiums = 0;
  for (const pass of [2, 4]) for (const o of tOwned) {
    if (total >= trainerCap) break;
    if (o.tclass === "Stadium") { if (stadiums >= 2) continue; stadiums += put(o, Math.min(2 - stadiums, left(o.id)), trainerCap); continue; }
    put(o, Math.min(pass - (rows.get(o.id) || 0), left(o.id)), trainerCap);
  }
  // 4. staples you'd need, to fill the Trainer slots
  for (const [name, n] of staples) {
    if (total >= trainerCap) break;
    const have = nameN.get(name) || 0; if (have < n) putNeed(name, n - have, null, trainerCap);
  }
  // 4b. still short of Trainers: more copies of the most useful staples
  for (const [name, n] of TOP_UP) {
    if (total >= trainerCap) break;
    const have = nameN.get(name) || 0;
    if (have < n) { const got = putOwned(name, n - have, null, trainerCap); if (have + got < n) putNeed(name, n - have - got, null, trainerCap); }
  }
  // 5. basic Energy: yours first, then what you'd need
  const eTypes = [...(mainTypes || "")].filter(t => BASIC_E[t]);
  if (eTypes.length) {
    const per = Math.ceil((60 - total) / eTypes.length);
    eTypes.forEach(t => {
      let want = Math.min(per, 60 - total);
      for (const o of pool.filter(o => o.basicEnergy && o.types === t)) { if (want <= 0) break; want -= put(o, Math.min(want, left(o.id))); }
      if (want > 0) put(info(BASIC_E[t]), want);
    });
  }
  // 6. anything else you own that fits, if there's still room
  for (const o of pool) { if (total >= 60) break; if (!fits(o)) continue; if (o.kind === "P" && !fitsType(o)) continue; put(o, Math.min(left(o.id), 1)); }
  return { main, cards: [...rows].map(([id, n]) => ({ id, n })) };
}

/* ---------- rules check ---------- */
function analyse(d) {
  const own = owned();
  const items = d.cards.map(r => ({ ...r, o: info(r.id) })).filter(r => r.o);
  const total = items.reduce((s, r) => s + r.n, 0);
  const byName = new Map(); let basics = 0, aces = 0, radiants = 0;
  for (const r of items) {
    if (!r.o.basicEnergy) byName.set(r.o.name, (byName.get(r.o.name) || 0) + r.n);
    if (r.o.basic) basics += r.n; if (r.o.ace) aces += r.n; if (r.o.radiant) radiants += r.n;
  }
  const over = [...byName].filter(([, n]) => n > 4).map(([k, n]) => `${k} (${n})`);
  const illegal = d.format === "standard" ? items.filter(r => r.o.legal <= 0).map(r => r.o.name) : [];
  const reprints = d.format === "standard" ? items.filter(r => r.o.legal === 2) : [];
  const names = new Set(items.map(r => r.o.name));
  const candy = names.has("Rare Candy");
  const orphans = items.filter(r => r.o.kind === "P" && r.o.from && !names.has(r.o.from) && !(candy && r.o.stage2 && names.has(lineOf(r.o, "any", own)[0]))).map(r => r.o.name);
  const checks = [
    { ok: total === 60, text: total === 60 ? "Exactly 60 cards" : total < 60 ? `${total} of 60 cards. Add ${60 - total} more.` : `${total} cards. Take out ${total - 60}.` },
    { ok: !over.length, text: over.length ? `More than 4 copies: ${over.join(", ")}` : "No more than 4 of any card (basic Energy has no limit)" },
    { ok: basics > 0, text: basics > 0 ? `${basics} Basic Pokémon to start with` : "Needs at least 1 Basic Pokémon" },
    { ok: aces <= 1, text: aces <= 1 ? "ACE SPEC: " + (aces ? "1 (the limit)" : "none") : `${aces} ACE SPEC cards. Only 1 is allowed.` },
    { ok: radiants <= 1, text: radiants <= 1 ? "Radiant Pokémon: " + (radiants ? "1 (the limit)" : "none") : `${radiants} Radiant Pokémon. Only 1 is allowed.` }
  ];
  if (d.format === "standard") checks.push({ ok: !illegal.length, text: illegal.length ? `Not legal in Standard: ${[...new Set(illegal)].join(", ")}` : "Every card is legal in Standard" });
  if (orphans.length) checks.push({ ok: true, warn: true, text: `Nothing to evolve from: ${[...new Set(orphans)].join(", ")}` });
  if (reprints.length) checks.push({ ok: true, info: true, text: `${[...new Set(reprints.map(r => r.o.name))].join(", ")}: older print, legal because it was reprinted with a current mark` });
  const need = items.map(r => ({ ...r, have: Math.min(r.n, own.get(r.id) || 0) })).filter(r => r.have < r.n).map(r => ({ ...r, need: r.n - r.have }));
  return { items, total, checks, need, valid: checks.every(c => c.ok), needCount: need.reduce((s, r) => s + r.need, 0) };
}

/* Pokemon grouped by evolution line, Trainers by kind (Supporter, Item, Tool, Stadium) */
function sections(a) {
  const own = owned(); const sec = { P: [], T: [], E: [] }; for (const r of a.items) sec[r.o.kind].push(r);
  const order = { Supporter: 0, Item: 1, Tool: 2, Stadium: 3 };
  const base = new Map(a.items.filter(r => r.o.kind === "P").map(r => [r.id, lineOf(r.o, "any", own)]));
  sec.P.sort((x, y) => base.get(x.id)[0].localeCompare(base.get(y.id)[0]) || base.get(x.id).indexOf(x.o.name) - base.get(y.id).indexOf(y.o.name) || x.o.name.localeCompare(y.o.name));
  sec.T.sort((x, y) => order[x.o.tclass] - order[y.o.tclass] || x.o.name.localeCompare(y.o.name) || y.n - x.n);
  return sec;
}

/* ---------- deck list text (Pokemon TCG Live format) ---------- */
const liveName = o => o.basicEnergy ? "Basic " + o.name.replace(/^Basic /, "") : o.name;
function exportText(d) {
  const a = analyse(d); const sec = sections(a);
  const line = r => `${r.n} ${liveName(r.o)} ${r.o.cat.set.code || r.o.cat.set.id.toUpperCase()} ${r.o.cat.number}`;
  const part = (h, k) => `${h}: ${sec[k].reduce((s, r) => s + r.n, 0)}\n` + sec[k].map(line).join("\n");
  return [part("Pokémon", "P"), part("Trainer", "T"), part("Energy", "E")].join("\n\n") + `\n\nTotal Cards: ${a.total}\n`;
}
function needText(d) {
  const a = analyse(d);
  return a.need.map(r => `${r.need} ${liveName(r.o)} ${r.o.cat.set.code || r.o.cat.set.id.toUpperCase()} ${r.o.cat.number}`).join("\n");
}
let codeIx = null;
function parseList(text, fmt) {
  if (!codeIx) { codeIx = new Map(); for (const c of Cat.cards) if (c.set.code) { const k = norm(c.set.code) + "|" + c.nn; if (!codeIx.has(k)) codeIx.set(k, c); } }
  const out = new Map(); const missed = [];
  const LET = { G: "Grass", R: "Fire", W: "Water", L: "Lightning", P: "Psychic", F: "Fighting", D: "Darkness", M: "Metal" };
  for (let raw of String(text).split(/\r?\n/)) {
    raw = raw.replace(/^\s*[-*•]\s*/, "").trim();
    if (!raw || /^(pok[eé]mon|trainers?|energy|total cards)\b.*:?\s*\d*\s*$/i.test(raw) || /^(pok[eé]mon|trainers?|energy)\s*[-:]/i.test(raw)) continue;
    const m = raw.match(/^(\d+)\s*x?\s+(.+)$/i); if (!m) { missed.push(raw); continue; }
    const n = parseInt(m[1], 10); let rest = m[2].trim().replace(/\{([A-Z])\}/g, (_, l) => LET[l] || l);
    let card = null;
    const bare = x => norm(x).replace(/^basic /, "");
    const cm = rest.match(/^(.*?)\s+([A-Za-z0-9-]{2,8})\s+([A-Za-z]*\d+[A-Za-z]?)$/);
    let byCode = null;
    if (cm) { byCode = codeIx.get(norm(cm[2]) + "|" + normNum(cm[3])) || null; rest = cm[1]; if (byCode && bare(byCode.name) === bare(rest)) card = byCode; }
    if (!card) {
      const nm = rest.replace(/^Basic (\w+ Energy)$/i, "$1");
      const o = bestPrint(nm, fmt) || bestPrint("Basic " + nm, fmt) || bestPrint(nm, "any");
      if (o) card = o.cat;
      else if (byCode) card = byCode;
      else { const s = searchCatalogue(nm, 1)[0]; if (s && bare(s.name) === bare(nm)) card = s; }
    }
    if (card) out.set(card.id, (out.get(card.id) || 0) + n); else missed.push(raw);
  }
  return { cards: [...out].map(([id, n]) => ({ id, n })), missed };
}

/* ---------- UI ---------- */
const ui = { route: "collection", deckId: null, err: "", busy: false };
let addQ = "", addAll = false, newFmt = "standard", newPick = null, newQ = "", confirmDel = false, legalOpen = false;

function injectShell() {
  const top = $(".top");
  const tabs = document.createElement("div"); tabs.className = "viewtabs";
  tabs.innerHTML = `<div class="wrap" role="tablist"><a href="#" role="tab" data-route="collection">Collection</a><a href="#decks" role="tab" data-route="decks">Decks</a></div>`;
  top.insertBefore(tabs, top.querySelector(".holo-rule"));
  $("main.wrap").classList.add("collection-main");
  const v = document.createElement("section"); v.id = "deckView"; v.className = "wrap deckview"; v.hidden = true;
  $("main.wrap").after(v);
  document.body.insertAdjacentHTML("beforeend", `
<dialog class="sheet" id="deckNewSheet" aria-labelledby="deckNewTitle"><div class="sheet-inner">
  <div class="sheet-head"><h2 id="deckNewTitle">Build a deck</h2><button class="close" type="button" data-dclose aria-label="Close">×</button></div>
  <div class="sheet-body" id="deckNewBody"></div></div></dialog>
<dialog class="sheet" id="deckAddSheet" aria-labelledby="deckAddTitle"><div class="sheet-inner">
  <div class="sheet-head"><h2 id="deckAddTitle">Add cards</h2><button class="close" type="button" data-dclose aria-label="Close">×</button></div>
  <div class="sheet-body" id="deckAddBody"></div></div></dialog>
<dialog class="sheet" id="deckPasteSheet" aria-labelledby="deckPasteTitle"><div class="sheet-inner">
  <div class="sheet-head"><h2 id="deckPasteTitle">Paste a deck list</h2><button class="close" type="button" data-dclose aria-label="Close">×</button></div>
  <div class="sheet-body" id="deckPasteBody"></div></div></dialog>`);
  document.querySelectorAll("[data-dclose]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
}

function route() {
  const h = location.hash.replace(/^#/, "");
  if (h.startsWith("deck/")) { ui.route = "deck"; ui.deckId = decodeURIComponent(h.slice(5)); }
  else if (h === "decks") { ui.route = "decks"; ui.deckId = null; }
  else { ui.route = "collection"; ui.deckId = null; }
  const onDecks = ui.route !== "collection";
  document.body.classList.toggle("on-decks", onDecks);
  $("#deckView").hidden = !onDecks;
  document.querySelectorAll(".viewtabs [data-route]").forEach(a => a.setAttribute("aria-selected", String((a.dataset.route === "decks") === onDecks)));
  confirmDel = false;
  if (onDecks) { try { window.scrollTo(0, 0); } catch (e) {} render(); }
}
const go = h => { if (location.hash === h) route(); else location.hash = h; };

async function render() {
  const v = $("#deckView");
  if (!DD.ready) {
    v.innerHTML = `<p class="muted dk-pad"><span class="spinner"></span>Loading card rules…</p>`;
    try { await Promise.all([waitCat(), loadDeckData()]); } catch (e) { v.innerHTML = `<p class="err dk-pad">The card rules didn't load. Check your connection and reopen the page.</p>`; return; }
  }
  if (ui.route === "deck") { const d = getDeck(ui.deckId); if (d) return renderEditor(d); go("#decks"); return; }
  renderHome();
}

function thumb(o) { return `<span class="thumb dk-thumb">${o ? `<img src="${esc(cardImage(o.cat))}" alt="" loading="lazy">` : ""}</span>`; }
function legalChip(o, fmt) {
  if (fmt !== "standard") return "";
  if (o.legal === 1) return "";
  if (o.legal === 2) return `<span class="chip dk-ok" title="Older print, legal because the card was reprinted with a current mark">Reprint OK</span>`;
  return `<span class="chip dk-bad">Not Standard${o.mark ? " (" + esc(o.mark) + ")" : ""}</span>`;
}

function renderHome() {
  const v = $("#deckView"); const own = owned();
  const mine = [...own.keys()].map(info).filter(Boolean);
  const legalN = mine.filter(o => o.legal > 0).length;
  const list = decks.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  v.innerHTML = `
  <div class="dk-head"><h2>Decks</h2><div class="actions"><button class="btn primary" id="dkNew" type="button">Build a deck</button><button class="btn" id="dkPaste" type="button">Paste a list</button></div></div>
  ${memOnly ? `<div class="notice">This browser isn't letting the page save, so decks will be gone when you close it.</div>` : ""}
  ${list.length ? `<ul class="dk-list">${list.map(d => { const a = analyse(d); const m = a.items.find(r => r.id === d.main) || a.items.find(r => r.o.kind === "P");
      return `<li><button class="row" type="button" data-deck="${esc(d.id)}">${thumb(m && m.o)}<span class="main"><span class="name">${esc(d.name)}</span>
      <span class="setline">${a.total}/60 · ${d.format === "standard" ? "Standard" : "Any cards"}${a.valid ? (a.needCount ? " · legal list" : " · ready to play") : ""}</span>
      <span class="chips">${a.needCount ? `<span class="chip dk-need">Need ${a.needCount}</span>` : `<span class="chip dk-ok">All owned</span>`}${a.valid ? "" : `<span class="chip dk-bad">Not legal yet</span>`}</span></span><span class="dk-go" aria-hidden="true">›</span></button></li>`; }).join("")}</ul>`
    : `<div class="empty dk-empty"><h2>No decks yet</h2><p>${own.size ? "Pick a Pokémon you own and Poke Lab builds a 60-card deck around it from your collection, then lists anything you'd still need." : "Add some cards to your collection first, or paste a deck list you found to see which cards you'd need."}</p></div>`}
  <section class="dk-legal">
    <button class="dk-legal-head" type="button" id="dkLegalToggle" aria-expanded="${legalOpen}"><span><b>${legalN} of ${mine.length}</b> cards you own are legal in Standard</span><span aria-hidden="true">${legalOpen ? "▴" : "▾"}</span></button>
    <p class="src">Standard right now: regulation marks ${esc(DD.firstMark)} and later, plus basic Energy and older prints of cards that were reprinted with a current mark. Rotation from April 10, 2026 (TCG Live from March 26).</p>
    ${legalOpen ? `<ul class="dk-rows">${mine.sort((a, b) => (b.legal > 0) - (a.legal > 0) || a.name.localeCompare(b.name)).map(o => `<li class="dk-row">${thumb(o)}<span class="main"><span class="name">${esc(o.name)}${own.get(o.id) > 1 ? ` <span class="muted">×${own.get(o.id)}</span>` : ""}</span><span class="setline mono">${esc(o.cat.set.code || o.cat.set.id)} ${esc(o.cat.number)}${o.mark ? " · mark " + esc(o.mark) : ""}</span></span><span>${o.legal === 1 ? `<span class="chip dk-ok">Standard</span>` : legalChip(o, "standard")}</span></li>`).join("")}</ul>` : ""}
  </section>`;
  $("#dkNew").addEventListener("click", openNew);
  $("#dkPaste").addEventListener("click", openPaste);
  $("#dkLegalToggle").addEventListener("click", () => { legalOpen = !legalOpen; renderHome(); });
  v.querySelectorAll("[data-deck]").forEach(b => b.addEventListener("click", () => go("#deck/" + encodeURIComponent(b.dataset.deck))));
}

/* new deck sheet */
function openNew() { newPick = null; newQ = ""; ui.err = ""; renderNew(); $("#deckNewSheet").showModal(); }
function renderNew() {
  const b = $("#deckNewBody"); const own = owned();
  const pk = [...own.keys()].map(info).filter(o => o && o.kind === "P" && okIn(newFmt, o));
  const seen = new Set(); const uniq = pk.filter(o => { const k = o.id; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (b.rule - a.rule) || (b.stage2 - a.stage2) || (b.hp - a.hp));
  const q = norm(newQ); const shown = uniq.filter(o => !q || norm(o.name).includes(q)).slice(0, 60);
  const typeCounts = TYPES.filter(t => t[0] !== "C" && t[0] !== "N").map(([l, n]) => [l, n, uniq.filter(o => o.types.includes(l)).length]).filter(t => t[2]);
  b.innerHTML = `
  <div><p class="section-label">Format</p>
    <div class="seg" role="radiogroup">
      <button type="button" role="radio" aria-checked="${newFmt === "standard"}" data-fmt="standard">Standard<small>Tournaments and TCG Live</small></button>
      <button type="button" role="radio" aria-checked="${newFmt === "any"}" data-fmt="any">Any cards<small>Casual, kitchen table</small></button>
    </div></div>
  <div><p class="section-label">Build around a Pokémon you own</p>
    ${uniq.length ? `<input type="search" id="dkNewQ" placeholder="Search your Pokémon" value="${esc(newQ)}" autocomplete="off">
    <ul class="cands dk-picks">${shown.map(o => `<li><button class="cand" type="button" aria-pressed="${newPick === o.id}" data-pick="${esc(o.id)}">${thumb(o).replace("dk-thumb", "")}<span class="t"><b>${esc(o.name)}</b><span>${esc(o.types.split("").map(typeName).join("/"))} · ${o.from ? "evolves from " + esc(o.from) : "Basic"}${o.hp ? " · " + o.hp + " HP" : ""}</span></span><span class="tick"></span></button></li>`).join("")}</ul>`
    : `<p class="muted">${own.size ? `None of your Pokémon are legal in ${newFmt === "standard" ? "Standard" : "this format"}. Try Any cards, or paste a deck list instead.` : "Your collection has no Pokémon yet."}</p>`}
  </div>
  ${typeCounts.length ? `<div><p class="section-label">Or pick a type</p><div class="chips dk-types">${typeCounts.map(([l, n, c]) => `<button class="chip dk-type" type="button" aria-pressed="${newPick === "type:" + l}" data-pick="type:${l}">${esc(n)} · ${c}</button>`).join("")}</div></div>` : ""}
  ${ui.err ? `<p class="err">${esc(ui.err)}</p>` : ""}
  <button class="btn primary" type="button" id="dkBuild" ${newPick ? "" : "disabled"}>Build my deck</button>
  <p class="src">It uses your cards first. If you don't own enough for 60, it adds the cards you'd need and lists them, so you can see what to buy.</p>`;
  b.querySelectorAll("[data-fmt]").forEach(x => x.addEventListener("click", () => { newFmt = x.dataset.fmt; newPick = null; renderNew(); }));
  const qi = $("#dkNewQ"); if (qi) qi.addEventListener("input", e => { newQ = e.target.value; const pos = e.target.selectionStart; renderNew(); const n = $("#dkNewQ"); n.focus(); n.setSelectionRange(pos, pos); });
  b.querySelectorAll("[data-pick]").forEach(x => x.addEventListener("click", () => { newPick = x.dataset.pick; renderNew(); }));
  $("#dkBuild").addEventListener("click", () => {
    const opts = newPick.startsWith("type:") ? { format: newFmt, type: newPick.slice(5) } : { format: newFmt, mainId: newPick };
    const res = autoBuild(opts);
    if (!res) { ui.err = "No Pokémon of that type to build around."; renderNew(); return; }
    const d = { id: uid(), name: res.main.name + " deck", format: newFmt, main: res.main.id, type: opts.type || "", built: true, cards: res.cards, created: Date.now() };
    decks.push(d); touch(d);
    $("#deckNewSheet").close(); go("#deck/" + d.id);
  });
}

/* paste a list */
function openPaste() { renderPaste(""); $("#deckPasteSheet").showModal(); }
function renderPaste(msg) {
  const b = $("#deckPasteBody");
  b.innerHTML = `<p class="muted">Paste a list from TCG Live, Limitless or a website. Lines look like <span class="mono">4 Ultra Ball MEG 131</span>. Poke Lab shows which cards you own and what you'd need.</p>
  <textarea id="dkPasteText" rows="12" placeholder="Pokémon: 12&#10;4 Riolu MEG 76&#10;…" spellcheck="false"></textarea>
  <div class="field"><label for="dkPasteFmt">Format</label><select id="dkPasteFmt"><option value="standard">Standard</option><option value="any">Any cards</option></select></div>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
  <button class="btn primary" type="button" id="dkPasteGo">Check this list</button>`;
  $("#dkPasteGo").addEventListener("click", () => {
    const fmt = $("#dkPasteFmt").value; const r = parseList($("#dkPasteText").value, fmt);
    if (!r.cards.length) { renderPaste("No cards found in that text."); return; }
    const top = r.cards.map(c => info(c.id)).filter(o => o && o.kind === "P").sort((a, b) => b.rule - a.rule || b.hp - a.hp)[0];
    const d = { id: uid(), name: top ? top.name + " list" : "Pasted list", format: fmt, main: top ? top.id : "", cards: r.cards, created: Date.now(), missed: r.missed.slice(0, 20) };
    decks.push(d); touch(d); $("#deckPasteSheet").close(); go("#deck/" + d.id);
    if (r.missed.length) toast(`${r.missed.length} line${r.missed.length === 1 ? "" : "s"} couldn't be matched`);
  });
}

/* editor */
function renderEditor(d) {
  const v = $("#deckView"); const a = analyse(d); const own = owned();
  const sec = sections(a);
  const row = r => { const have = own.get(r.id) || 0; return `<li class="dk-row">${thumb(r.o)}<span class="main"><span class="name">${esc(liveName(r.o))}</span>
    <span class="setline mono">${esc(r.o.cat.set.code || r.o.cat.set.id)} ${esc(r.o.cat.number)}${r.o.tclass ? ` · <span class="dk-tc">${esc(r.o.tclass)}</span>` : ""}</span>
    <span class="chips">${have >= r.n ? `<span class="chip dk-ok">Own ${have}</span>` : `<span class="chip dk-need">Need ${r.n - have}${have ? ` · own ${have}` : ""}</span>`}${legalChip(r.o, d.format)}${r.o.ace ? `<span class="chip">ACE SPEC</span>` : ""}</span></span>
    <span class="qty dk-qty"><button type="button" data-dec="${esc(r.id)}" aria-label="One less ${esc(r.o.name)}">−</button><b class="num">${r.n}</b><button type="button" data-inc="${esc(r.id)}" aria-label="One more ${esc(r.o.name)}">+</button></span></li>`; };
  const block = (title, k) => sec[k].length ? `<section><h3 class="dk-sec">${title} <span class="muted num">${sec[k].reduce((s, r) => s + r.n, 0)}</span></h3><ul class="dk-rows">${sec[k].map(row).join("")}</ul></section>` : "";
  v.innerHTML = `
  <div class="dk-bar"><a href="#decks" class="linkbtn">‹ Decks</a></div>
  <div class="dk-title"><label class="sr" for="dkName">Deck name</label><input id="dkName" type="text" value="${esc(d.name)}" maxlength="60"></div>
  <div class="dk-summary">
    <div class="fact"><div class="k">Cards</div><div class="v dk-big num">${a.total}<small>/60</small></div></div>
    <div class="fact"><div class="k">You need</div><div class="v dk-big num">${a.needCount}<small> cards</small></div></div>
    <div class="field"><label for="dkFmt">Format</label><select id="dkFmt"><option value="standard" ${d.format === "standard" ? "selected" : ""}>Standard</option><option value="any" ${d.format === "any" ? "selected" : ""}>Any cards</option></select></div>
  </div>
  <ul class="dk-checks">${a.checks.map(c => `<li class="${c.info ? "i" : c.warn ? "w" : c.ok ? "y" : "n"}"><span aria-hidden="true">${c.info ? "i" : c.warn ? "!" : c.ok ? "✓" : "✕"}</span>${esc(c.text)}</li>`).join("")}</ul>
  ${d.missed && d.missed.length ? `<div class="notice"><span><b>Lines that didn't match:</b> ${d.missed.map(esc).join("; ")}</span></div>` : ""}
  ${a.need.length ? `<section class="dk-needs"><h3 class="dk-sec">To finish this deck you need</h3><ul>${a.need.map(r => `<li><b class="num">${r.need}×</b> ${esc(liveName(r.o))} <span class="mono muted">${esc(r.o.cat.set.code || r.o.cat.set.id)} ${esc(r.o.cat.number)}</span></li>`).join("")}</ul>
    <p class="src">Any print with the same name works, as long as it's legal in your format.</p><button class="btn small" type="button" id="dkCopyNeed">Copy shopping list</button></section>` : ""}
  ${block("Pokémon", "P")}${block("Trainer", "T")}${block("Energy", "E")}
  ${a.items.length ? "" : `<p class="muted">This deck is empty. Add cards or rebuild it from your collection.</p>`}
  <div class="actions dk-actions">
    <button class="btn primary" type="button" id="dkAdd">Add cards</button>
    <button class="btn" type="button" id="dkCopy">Copy for TCG Live</button>
    ${d.built ? `<button class="btn" type="button" id="dkRebuild">Rebuild from my cards</button>` : ""}
    <button class="btn danger" type="button" id="dkDel">Delete deck</button>
  </div>
  ${confirmDel ? `<div class="confirm"><span>Delete ${esc(d.name)}? Your collection isn't touched.</span><div class="actions"><button class="btn danger small" type="button" id="dkDelYes">Delete</button><button class="btn small" type="button" id="dkDelNo">Keep it</button></div></div>` : ""}
  <p class="src">Decks are saved in this browser and use the cards in your collection; the same card can be in more than one deck.</p>`;
  $("#dkName").addEventListener("change", e => { d.name = e.target.value.trim() || "Untitled deck"; touch(d); });
  $("#dkFmt").addEventListener("change", e => { d.format = e.target.value; touch(d); renderEditor(d); });
  v.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => { const r = d.cards.find(x => x.id === b.dataset.inc); setCount(d, r.id, r.n + 1); renderEditor(d); }));
  v.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => { const r = d.cards.find(x => x.id === b.dataset.dec); setCount(d, r.id, r.n - 1); renderEditor(d); }));
  $("#dkAdd").addEventListener("click", () => { addQ = ""; addAll = false; renderAdd(d); $("#deckAddSheet").showModal(); });
  $("#dkCopy").addEventListener("click", () => copy(exportText(d), "Deck list copied. In TCG Live, open Decks and choose Import."));
  const cn = $("#dkCopyNeed"); if (cn) cn.addEventListener("click", () => copy(needText(d), "Shopping list copied"));
  const rb = $("#dkRebuild"); if (rb) rb.addEventListener("click", () => { const res = autoBuild({ format: d.format, mainId: d.main, type: d.type }); if (res) { d.cards = res.cards; d.missed = []; touch(d); renderEditor(d); toast("Rebuilt from your collection"); } });
  $("#dkDel").addEventListener("click", () => { confirmDel = true; renderEditor(d); });
  const y = $("#dkDelYes"); if (y) y.addEventListener("click", () => { decks = decks.filter(x => x.id !== d.id); saveDecks(); toast(`Deleted ${d.name}`); go("#decks"); });
  const n = $("#dkDelNo"); if (n) n.addEventListener("click", () => { confirmDel = false; renderEditor(d); });
}
async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch (e) {
    const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.append(t); t.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} t.remove();
    toast(ok ? msg : "Couldn't copy. Your browser blocked the clipboard.");
  }
}

/* add cards sheet */
function renderAdd(d) {
  const b = $("#deckAddBody"); const own = owned(); const q = norm(addQ);
  let list;
  if (addAll) list = q ? searchCatalogue(addQ, 40).map(c => info(c.id)).filter(Boolean) : [];
  else list = [...own.keys()].map(info).filter(o => o && (!q || (norm(o.name) + " " + norm(o.cat.set.name) + " " + norm(o.cat.set.code)).includes(q))).sort((x, y) => x.kind.localeCompare(y.kind) || x.name.localeCompare(y.name)).slice(0, 80);
  const inDeck = id => (d.cards.find(x => x.id === id) || { n: 0 }).n;
  b.innerHTML = `
  <div class="seg" role="radiogroup"><button type="button" role="radio" aria-checked="${!addAll}" data-all="0">My cards</button><button type="button" role="radio" aria-checked="${addAll}" data-all="1">All cards</button></div>
  <input type="search" id="dkAddQ" placeholder="${addAll ? "Name, set or number" : "Search your cards"}" value="${esc(addQ)}" autocomplete="off">
  ${addAll && !q ? `<p class="muted">Search the full catalogue to add a card you don't own yet. It'll show up on your shopping list.</p>` : ""}
  <ul class="dk-rows">${list.map(o => `<li class="dk-row">${thumb(o)}<span class="main"><span class="name">${esc(liveName(o))}</span><span class="setline mono">${esc(o.cat.set.code || o.cat.set.id)} ${esc(o.cat.number)}</span>
    <span class="chips">${own.get(o.id) ? `<span class="chip dk-ok">Own ${own.get(o.id)}</span>` : ""}${legalChip(o, d.format)}${inDeck(o.id) ? `<span class="chip grade">In deck ${inDeck(o.id)}</span>` : ""}</span></span>
    <button class="btn small" type="button" data-add="${esc(o.id)}">Add</button></li>`).join("")}</ul>
  ${!addAll && q && !list.length ? `<p class="muted">None of your cards match. Try All cards.</p>` : ""}`;
  b.querySelectorAll("[data-all]").forEach(x => x.addEventListener("click", () => { addAll = x.dataset.all === "1"; renderAdd(d); }));
  const qi = $("#dkAddQ"); qi.addEventListener("input", e => { addQ = e.target.value; const pos = e.target.selectionStart; renderAdd(d); const n = $("#dkAddQ"); n.focus(); n.setSelectionRange(pos, pos); });
  b.querySelectorAll("[data-add]").forEach(x => x.addEventListener("click", () => { const id = x.dataset.add; setCount(d, id, inDeck(id) + 1); toast(`Added ${info(id).name}`); renderAdd(d); renderEditor(d); }));
}
document.addEventListener("close", e => { if (e.target && e.target.id === "deckAddSheet" && ui.route === "deck") { const d = getDeck(ui.deckId); if (d) renderEditor(d); } }, true);

/* ---------- start ---------- */
loadDecks();
injectShell();
addEventListener("hashchange", route);
// the collection changed (a card added, prices refreshed): redraw, but not under someone typing or in an open sheet
let redraw = null;
Store.onChange(() => {
  clearTimeout(redraw);
  redraw = setTimeout(() => {
    const typing = document.activeElement && $("#deckView").contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (ui.route !== "collection" && DD.ready && !typing && !document.querySelector("dialog.sheet[open]")) render();
  }, 400);
});
route();
// for checks in the browser console and tests
window.PokeLabDecks = { autoBuild, analyse, exportText, parseList, info, loadDeckData, get decks() { return decks; } };
})();
