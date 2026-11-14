import sys
src, out = sys.argv[1], sys.argv[2]
body = open(src).read()
head = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Log your Pokemon cards from photos with official set numbers, rarity, condition and live prices.">
<meta name="theme-color" content="#131920">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Poke Lab">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
i = body.index('<header class="top">')
sw = '<script>if("serviceWorker" in navigator&&location.protocol==="https:"){addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}</script>\n'
open(out, 'w').write(head + body[:i] + '</head>\n<body>\n' + body[i:] + '\n' + sw + '</body>\n</html>\n')
