import json,sys
src=sys.argv[1]; out=sys.argv[2]
sets=json.load(open(src+'/sets/en.json'))
sets.sort(key=lambda s:(s['releaseDate'],s['id']))
rar=[];sup=[]
def idx(lst,v):
    if v not in lst: lst.append(v)
    return lst.index(v)
S=[];C=[]
for si,s in enumerate(sets):
    S.append([s['id'],s['name'],s['series'],s.get('printedTotal'),s.get('ptcgoCode') or '',s['releaseDate']])
    for c in json.load(open(f"{src}/cards/en/{s['id']}.json")):
        img=c['images']['small']
        if img==f"https://images.pokemontcg.io/{s['id']}/{c['number']}.png": im=0
        elif img==f"https://images.scrydex.com/pokemon/{c['id']}/small": im=1
        else: im=img
        row=[si,c['number'],c['name'],idx(rar,c.get('rarity') or ''),idx(sup,c.get('supertype') or '')]
        if c['id']!=f"{s['id']}-{c['number']}": row.append(c['id'])
        else: row.append(0)
        row.append(im)
        C.append(row)
json.dump({'v':'2026-11-08','sets':S,'rarities':rar,'supertypes':sup,'cards':C},open(out,'w'),separators=(',',':'),ensure_ascii=False)
print(len(S),len(C))
