#!/usr/bin/env python3
"""Reconstruit une arborescence de sources éditables à partir du HTML autonome construit
(dist/solfege-quest.html ou HTML extrait de SolfegeQuest.exe).

Usage : python3 tools/extract_sources.py app.html
Produit : src/index.html, src/css/00-base.css, src/js/00-app.js (non formatés : voir tools/format.mjs),
          vendor/fonts/*.woff2, vendor/data/*.js, vendor/icons/feather-sprite.json
"""
import base64, json, pathlib, re, sys

R = pathlib.Path(__file__).resolve().parent.parent
h = open(sys.argv[1], encoding='utf-8').read()

# --- en-tête (sans le script propre à l'exe, réinjecté au build)
head_end = h.find('<style>')
head = re.sub(r'<link rel="icon"[^>]*>|<script>\(function\(\)\{try\{window\.SQ_EXE.*?</script>', '', h[:head_end], flags=re.S)

# --- CSS : polices → fichiers woff2
s0 = head_end + 7
s1 = h.find('</style>', s0)
css = h[s0:s1]
fonts = []
def font(m):
    block = m.group(0)
    fam = re.search(r'font-family:([^;]+)', block).group(1).strip('"\'')
    style = re.search(r'font-style:([^;}]+)', block).group(1)
    name = f"{fam.lower()}-{style}.woff2"
    data = re.search(r'base64,([A-Za-z0-9+/=]+)', block).group(1)
    (R / 'vendor/fonts' / name).write_bytes(base64.b64decode(data))
    fonts.append(block.replace(data, '{{FILE:%s}}' % name))
    return ''
css = re.sub(r'@font-face\{[^}]*\}', font, css)
(R / 'vendor/fonts/fonts.css').write_text('\n'.join(fonts) + '\n')
(R / 'src/css/00-base.css').write_text(css)

# --- corps : sprite d'icônes
b0 = h.find('<body>')
j0 = h.find('<script>', s1) + 8
body = h[b0:j0 - 8]
sprite = dict(re.findall(r'<symbol id="i-([^"]+)" viewBox="0 0 24 24">(.*?)</symbol>', body, flags=re.S))
(R / 'vendor/icons/sprite-v1.json').write_text(json.dumps(sprite, ensure_ascii=False, indent=0))
body_rest = re.sub(r'<svg xmlns[^>]*aria-hidden="true"><defs>.*?</defs></svg>', '<!--{{SPRITE}}-->', body, flags=re.S)

# --- JS : grosses données → vendor/data
j1 = h.rfind('</script>')
js = h[j0:j1]

def cut(js, prefix, name, keep=True):
    i = js.find(prefix)
    assert i >= 0, prefix
    st = i + len(prefix)
    assert js[st] == '{'
    depth, k, q = 0, st, None
    while True:
        c = js[k]
        if q:
            if c == '\\': k += 2; continue
            if c == q: q = None
        elif c in '"\'`': q = c
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: break
        k += 1
    if keep:
        (R / 'vendor/data' / (name + '.js')).write_text(js[st:k + 1])
    return js[:st] + '/*{{%s}}*/{}' % name.upper() + js[k + 1:]

js = cut(js, 'const SMP_DATA=', 'smp_data')
js = cut(js, 'const HOME_IMG=', 'home_img', keep=False)  # photos du menu : retirées (icônes)
js = cut(js, 'Termin\\xE9"),s};{const A=', 'pdfjs')
js = cut(js, 'const GLYPH_PATHS=', 'glyph_paths')
(R / 'src/js/00-app.js').write_text(js)

(R / 'src/index.html').write_text(head + '<style>\n/*{{FONTS}}*/\n/*{{CSS}}*/\n</style>\n</head>\n' + body_rest + '<script>\n/*{{JS}}*/\n</script>\n</body>\n</html>\n')
print('ok', len(css), len(js), len(sprite), 'icônes')
