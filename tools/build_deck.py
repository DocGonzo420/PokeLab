"""Build deck.json: gameplay facts for cards playable in Expanded or carrying a regulation mark.
Row: [id, kind(P/T/E), subtypes, hp, types, evolvesFrom, attacks, abilities, mark, expandedLegal, roles]
attacks: [[name, cost letters, damage]]; roles (trainers): letters, see ROLE_RULES."""
import json, re, sys
src, out = sys.argv[1], sys.argv[2]
TL = {"Grass":"G","Fire":"R","Water":"W","Lightning":"L","Psychic":"P","Fighting":"F","Darkness":"D","Metal":"M","Fairy":"Y","Dragon":"N","Colorless":"C"}
ROLE_RULES = [
  ("D", r"\bdraws? (?:\d+|a|an?\s\w+) cards?|\bdraws? cards until|\bdraws? a card for each|then, draws? |draws? \d+ more cards"),
  ("S", r"search your deck for [^.]{0,90}pok[eé]mon"),
  ("E", r"search your deck for [^.]{0,60}energy|attach [^.]{0,80}energy"),
  ("W", r"switch your active pok[eé]mon with 1 of your benched"),
  ("G", r"switch (?:in )?1 of your opponent'?s benched|opponent'?s benched pok[eé]mon[^.]{0,60}switch it with"),
  ("R", r"from your discard pile[^.]{0,120}(?:into your hand|into your deck)|(?:put|shuffle)[^.]{0,80}from your discard pile"),
  ("C", r"stage 2 card in your hand that evolves|evolve[^.]{0,40}(?:during your first turn|skipping)"),
  ("U", r"supporter card[^.]{0,60}into your hand|search your deck for [^.]{0,40}(?:trainer|supporter) card"),
]
sets = json.load(open(src + "/sets/en.json")); sets.sort(key=lambda s: (s["releaseDate"], s["id"]))
rows = []
for s in sets:
    for c in json.load(open(f"{src}/cards/en/{s['id']}.json")):
        L = c.get("legalities", {}); mark = c.get("regulationMark") or ""
        exp = 1 if L.get("expanded") == "Legal" else 0
        st = c.get("supertype", ""); subs = c.get("subtypes") or []
        kind = "P" if st.startswith("Pok") else "T" if st == "Trainer" else "E"
        basic_energy = kind == "E" and "Basic" in subs
        if not (exp or mark or basic_energy): continue
        atk = [[a.get("name",""), "".join(TL.get(x, "C") for x in a.get("cost") or []), a.get("damage","")] for a in c.get("attacks") or []]
        abil = [a.get("name","") for a in c.get("abilities") or []]
        roles = ""
        if kind == "T":
            text = " ".join(r for r in (c.get("rules") or []) if not r.startswith("You may play only 1") and "ACE SPEC" not in r).lower()
            if c["name"] == "Rare Candy": roles += "C"
            for k, rx in ROLE_RULES:
                if k not in roles and re.search(rx, text): roles += k
        rows.append([c["id"], kind, "|".join(subs), int(c["hp"]) if str(c.get("hp","")).isdigit() else 0,
                     "".join(TL.get(t, "C") for t in c.get("types") or []), c.get("evolvesFrom") or "", atk, abil, mark, exp, roles])
json.dump({"v": "2026-11-14", "rows": rows}, open(out, "w"), separators=(",", ":"), ensure_ascii=False)
print(len(rows))
