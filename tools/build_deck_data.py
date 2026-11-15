"""Build deck.json, the extra card facts the Deck Builder needs, from PokemonTCG/pokemon-tcg-data.

Usage: python3 tools/build_deck_data.py <path-to-pokemon-tcg-data> deck.json
Each row: [id, subtype bits (bit 30 = basic Energy), type letters, evolves from, regulation mark,
           Standard legal (0 no, 1 yes, 2 yes through a reprint), HP, attack Energy letters]

Standard legality is worked out here from each card's regulation mark, because the
"legalities" field in the source data lags behind rotations. Rules used (2026 Standard,
from TPCi's rotation announcement, in effect April 10, 2026 and in TCG Live since March 26, 2026):
  - Cards with regulation mark H, I, J or any later mark are legal. G and older are not.
  - Basic Energy is always legal.
  - An older print is legal when a legal print has the same name (the reprint rule: "older versions
    of cards that don't have a regulation mark can still be used if the card is currently legal",
    e.g. Sun & Moon Rare Candy is fine because of its Mega Evolution reprint). For Pokemon the
    attacks and HP must match too. Trainers and Energy from before Black & White (2011) must also
    have the same effect text, because some old cards share a name but work differently.
When the next rotation is announced, change FIRST_LEGAL_MARK and rebuild.
"""
import json, re, sys

FIRST_LEGAL_MARK = "H"
src, out = sys.argv[1], sys.argv[2]
sets = json.load(open(src + "/sets/en.json"))
sets.sort(key=lambda s: (s["releaseDate"], s["id"]))

TYPE_LETTER = {"Grass": "G", "Fire": "R", "Water": "W", "Lightning": "L", "Psychic": "P", "Fighting": "F",
               "Darkness": "D", "Metal": "M", "Fairy": "Y", "Dragon": "N", "Colorless": "C"}
BASIC_ENERGY = {t + " Energy" for t in ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy"]}

subs = []
def sub_mask(lst):
    m = 0
    for s in lst or []:
        if s not in subs: subs.append(s)
        m |= 1 << subs.index(s)
    return m

def is_basic_energy(c):
    if c.get("supertype") != "Energy": return False
    if "Special" in (c.get("subtypes") or []): return False
    n = c["name"].replace("Basic ", "")
    return n in BASIC_ENERGY

def text_key(c):
    """Same name + same game text = the same card for the reprint rule."""
    if c.get("supertype") == "Pokémon":
        atk = tuple((a.get("name"), a.get("damage", ""), tuple(a.get("cost") or [])) for a in c.get("attacks") or [])
        abl = tuple(a.get("name") for a in c.get("abilities") or [])
        return ("P", c["name"], c.get("hp"), atk, abl)
    return (c.get("supertype"), c["name"], effect_text(c))

BOILERPLATE = ("youmayplay", "youcanplayonly", "youcanthavemorethan", "attachpokemontool", "staysinplay",
               "samenameisplayed", "discardthiscardifanother", "pokemontoolcards", "aceSPEC".lower(), "playthisstadium")
def effect_text(c):
    """The card's own effect, ignoring the reminder lines whose wording changes between eras."""
    out = []
    for r in c.get("rules") or []:
        t = re.sub(r"[^a-z0-9]", "", r.lower().replace("é", "e"))
        if any(b in t for b in BOILERPLATE): continue
        out.append(t)
    return "|".join(out)

def legal_mark(m):
    return bool(m) and len(m) == 1 and m >= FIRST_LEGAL_MARK

MODERN = "2011/04/25"  # Black & White, from when Trainer wording became the modern kind
allcards = []
for s in sets:
    for c in json.load(open(f"{src}/cards/en/{s['id']}.json")):
        c["_released"] = s["releaseDate"]
        allcards.append(c)

def reprint_keys(c):
    if c.get("supertype") == "Pokémon": return [text_key(c)]
    keys = [text_key(c)]
    if c["_released"] >= MODERN: keys.append((c.get("supertype"), c["name"]))
    return keys

legal_keys = set()
for c in allcards:
    if legal_mark(c.get("regulationMark")):
        legal_keys.add(text_key(c)); legal_keys.add((c.get("supertype"), c["name"]))

rows = []
for c in allcards:
    if is_basic_energy(c): legal = 1
    elif legal_mark(c.get("regulationMark")): legal = 1
    elif any(k in legal_keys for k in reprint_keys(c)): legal = 2   # legal through a legal reprint
    else: legal = 0
    types = "".join(TYPE_LETTER.get(t, "") for t in c.get("types") or [])
    if is_basic_energy(c):
        n = c["name"].replace("Basic ", "").replace(" Energy", "")
        types = TYPE_LETTER.get(n, "")
    hp = int(c["hp"]) if str(c.get("hp", "")).isdigit() else 0
    # Energy types the card's attacks ask for (not Colorless), e.g. Dragapult ex -> "RP"
    cost = "".join(sorted({TYPE_LETTER.get(e, "") for a in c.get("attacks") or [] for e in a.get("cost") or []} - {"C", ""}))
    rows.append([c["id"], sub_mask(c.get("subtypes")) | (1 << 30 if is_basic_energy(c) else 0), types,
                 c.get("evolvesFrom") or "", c.get("regulationMark") or "", legal, hp, cost])

json.dump({"v": "2026-11-08", "firstLegalMark": FIRST_LEGAL_MARK, "subtypes": subs, "cards": rows},
          open(out, "w"), separators=(",", ":"), ensure_ascii=False)
print(len(rows), "cards;", sum(1 for r in rows if r[5]), "Standard-legal;", sum(1 for r in rows if r[5] == 2), "through a reprint")
