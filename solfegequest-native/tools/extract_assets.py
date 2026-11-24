#!/usr/bin/env python3
"""Prépare les ressources de la version native à partir de l'ancienne application web
(../solfegequest-app) — à lancer une fois, les fichiers produits sont versionnés dans assets/.

  python3 tools/extract_assets.py

Produit :
  assets/samples.bin      échantillons MP3 (format décrit dans src/samples.hpp)
  assets/Inter.ttf, Inter-SemiBold.ttf, Fraunces.ttf, Bravura.ttf
  assets/data.json        projet de démo, boucles, progressions, instruments, kits, cours (via Chromium)
Prérequis : pip install fonttools brotli ; Playwright + Chromium (pour data.json).
"""
import base64
import json
import pathlib
import re
import struct
import subprocess
import sys

R = pathlib.Path(__file__).resolve().parent.parent
WEB = R.parent / 'solfegequest-app'
A = R / 'assets'
A.mkdir(exist_ok=True)

# ------------------------------------------------------------------ échantillons
src = (WEB / 'vendor/data/smp_data.js').read_text()
entries = []
# banques mélodiques : nom:{...s:[[midi,couche,"b64"(,a,b)],...]}
for m in re.finditer(r'(\w+):\{(?:layers:\d+,)?s:\[', src):
    pack = m.group(1)
    pos = m.end()
    for e in re.finditer(r'\[(\d+),(\d+),"([A-Za-z0-9+/=]+)"((?:,[-\d.e]+)*)\]', src[pos:pos + 3_000_000]):
        if src[pos + e.start() - 1] not in '[,':
            break
        extra = [float(x) for x in e.group(4).split(',')[1:]] if e.group(4) else []
        entries.append((pack, e.group(1), int(e.group(2)), extra, base64.b64decode(e.group(3))))
        nxt = src[pos + e.end():pos + e.end() + 2]
        if nxt.startswith(']'):
            break
# batterie : drums:{d:{nom:[[variante,couche,"b64"],...],...}}
d0 = src.index('drums:{d:{') + len('drums:{d:{')
d1 = re.compile(r'\]\}\},\w+:\{').search(src, d0).start() + 2   # fin de l'objet drums
for m in re.finditer(r'(\w+):\[((?:\[\d+,\d+,"[A-Za-z0-9+/=]+"(?:,[-\d.e]+)*\],?)+)\]', src[d0:d1]):
    for e in re.finditer(r'\[(\d+),(\d+),"([A-Za-z0-9+/=]+)"', m.group(2)):
        entries.append(('drums', m.group(1), int(e.group(1)) * 10 + int(e.group(2)), [], base64.b64decode(e.group(3))))

with open(A / 'samples.bin', 'wb') as f:
    f.write(b'SQSB' + struct.pack('<I', len(entries)))
    for pack, key, layer, extra, data in entries:
        pb, kb = pack.encode(), key.encode()
        ex = (extra + [0.0, 0.0])[:2]
        f.write(struct.pack('<B', len(pb)) + pb + struct.pack('<B', len(kb)) + kb)
        f.write(struct.pack('<hffI', layer, ex[0], ex[1], len(data)) + data)
packs = sorted({e[0] for e in entries})
print(f'samples.bin : {len(entries)} échantillons, banques {packs}, {(A / "samples.bin").stat().st_size // 1024} Ko')

# ------------------------------------------------------------------ polices (woff2 → ttf)
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def conv(src_name, dst, wght=None):
    f = TTFont(WEB / 'vendor/fonts' / src_name)
    if wght is not None and 'fvar' in f:
        f = instancer.instantiateVariableFont(f, {'wght': wght})
    f.flavor = None
    f.save(A / dst)
    print(dst, (A / dst).stat().st_size // 1024, 'Ko')


conv('inter-normal.woff2', 'Inter.ttf', 400)
conv('inter-normal.woff2', 'Inter-SemiBold.ttf', 600)
conv('fraunces-normal.woff2', 'Fraunces.ttf', 420)
conv('bravura-normal.woff2', 'Bravura.ttf')

# ------------------------------------------------------------------ données (via le moteur JS d'origine)
html = WEB / 'dist/solfege-quest.html'
if not html.exists():
    subprocess.check_call(['node', 'tools/build.mjs'], cwd=WEB)
js = r"""
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.argv[2] + '#home'); await p.waitForTimeout(1500);
  const d = await p.evaluate(() => {
    const ins = Object.entries(INS).map(([id, v]) => ({ id, n: v.n, cat: v.cat, drum: !!v.drum, pack: v.pack || null, ctl: v.ctl || [] }));
    const progs = PROGS.map((x) => ({ id: x.id, n: x.n, mode: x.mode, ch: x.ch || x.chords || x.c || null, raw: x }));
    const loops = LOOPS.map((l) => ({ id: l.id, n: l.n, cat: l.cat, inst: l.inst, bars: l.bars, mode: l.mode, bpm: l.bpm, notes: l.notes }));
    const ch = EDU_CH.map((c) => ({ id: c.id, n: c.n, ic: c.ic, d: c.d, lessons: c.lessons.map((l) => ({ id: l.id, n: l.n, min: l.min })) }));
    const demo = demoProject();
    demo.tracks.forEach((t) => t.regions.forEach((r) => { if (r.drummer && !(r.notes || []).length) r.notes = drummerNotes(r, demo); }));
    return { demo, ins, kits: KITS, progs, loops, patches: PATCHES, eduChapters: ch, gloss: EduReg.gloss };
  });
  require('fs').writeFileSync(process.argv[3], JSON.stringify(d));
  await b.close();
})();
"""
tmp = A / '_dump.js'
tmp.write_text(js)
try:
    subprocess.check_call(['node', str(tmp), str(html), str(A / 'data.json')])
finally:
    tmp.unlink()
print('data.json', (A / 'data.json').stat().st_size // 1024, 'Ko')
