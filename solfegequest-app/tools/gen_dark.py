#!/usr/bin/env python3
"""Génère src/css/85-edu-dark.css : équivalents sombres et à plat des règles du module Éducation
(écrites à l'origine pour un thème clair) contenues dans src/css/00-base.css.

Usage : python3 tools/gen_dark.py
- fonds clairs (#fff, #ffffffxx, rgba(255,255,255,a), couleurs très claires) → gris anthracite ;
- dégradés → couleur unie ;
- textes foncés → clairs ; bordures noires transparentes → blanches transparentes ;
- ombres « verre » (inset blanc) supprimées.
Les éléments de notation (portées, claviers, papier, métronome, cercle) gardent leurs couleurs.
"""
import pathlib
import re

R = pathlib.Path(__file__).resolve().parent.parent
css = (R / 'src/css/00-base.css').read_text()
START = css.index('\n.edu {')            # début du module Éducation
SCOPE = '#app[data-mode=edu]'
KEEP = re.compile(r'\.ek\b|\.ek\.|\.ekey|\.ekeys|staff|paper|\.ring|circsvg|\.circ\b|\.mrod|\.mw\b|\.md\b|\.md\.|\.mdots|metro|\.egtr|\.ewgtr|\.escale|\.gdiag|\.bc\b|\.k\.')

PANEL = '#262628'
PANEL2 = '#2e2e31'


def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h[:3])
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    r, g, b = (c / 255 for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def sat(rgb):
    mx, mn = max(rgb), min(rgb)
    return 0 if mx == 0 else (mx - mn) / mx


def fix_bg(v):
    v = re.sub(r'color-mix\(in srgb,\s*([^,]+?)\s+(\d+)%,\s*#fff(?:fff)?\)',
               lambda m: f'color-mix(in srgb, {m.group(1)} {min(60, int(m.group(2)) + 10)}%, {PANEL})', v)
    v = re.sub(r'rgba\(255,\s*255,\s*255,\s*([\d.]+)\)', lambda m: f'rgba(255, 255, 255, {min(0.08, float(m.group(1)) * 0.12):.3f})', v)
    v = re.sub(r'#ffffff([0-9a-fA-F]{2})\b', 'rgba(255, 255, 255, .05)', v)

    def hexfix(m):
        h = m.group(0)
        try:
            rgb = hex_rgb(h)
        except ValueError:
            return h
        if lum(rgb) > 0.82:
            return PANEL if sat(rgb) < 0.12 else f'color-mix(in srgb, {h} 14%, {PANEL})'
        return h
    v = re.sub(r'#[0-9a-fA-F]{3,8}\b', hexfix, v)
    v = re.sub(r'\bwhite\b', PANEL, v)
    # dégradés → couleur unie (premier arrêt)
    if 'linear-gradient' in v or 'radial-gradient' in v:
        stops = re.findall(r'(color-mix\([^()]*\)|rgba?\([^()]*\)|#[0-9a-fA-F]{3,8}\b|var\(--[\w-]+\))', v)
        v = stops[0] if stops else PANEL2
    return v


def fix_color(v):
    def hexfix(m):
        h = m.group(0)
        rgb = hex_rgb(h)
        if lum(rgb) < 0.35:
            return 'var(--ink)' if sat(rgb) < 0.25 else f'color-mix(in srgb, {h} 45%, #fff)'
        return h
    v = re.sub(r'#[0-9a-fA-F]{3,8}\b', hexfix, v)
    v = re.sub(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)',
               lambda m: f'rgba(235, 235, 245, {max(0.4, float(m.group(4))):.2f})' if lum(tuple(int(m.group(i)) for i in (1, 2, 3))) < 0.35 else m.group(0), v)
    return v


def fix_border(v):
    v = re.sub(r'rgba\(0,\s*0,\s*0,\s*([\d.]+)\)', 'rgba(255, 255, 255, .1)', v)
    v = re.sub(r'#000000[0-9a-fA-F]{2}\b', 'rgba(255, 255, 255, .1)', v)
    v = re.sub(r'#ffffff[0-9a-fA-F]{2}\b|#fff\b|#ffffff\b', 'rgba(255, 255, 255, .1)', v)
    v = re.sub(r'color-mix\(in srgb,\s*([^,]+?)\s+(\d+)%,\s*#fff(?:fff)?\)', r'color-mix(in srgb, \1 \2%, #3a3a3c)', v)
    return v


out = ['/* Généré par tools/gen_dark.py — ne pas modifier à la main. */']
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css[START:]):
    sel, body = m.group(1).strip(), m.group(2)
    if sel.startswith('@') or sel.startswith('from') or sel.startswith('to') or '%' in sel.split(',')[0]:
        continue
    if KEEP.search(sel):
        continue
    decls = []
    for d in body.split(';'):
        if ':' not in d:
            continue
        prop, val = d.split(':', 1)
        prop, val = prop.strip(), ' '.join(val.split())
        if prop in ('background', 'background-color', 'background-image'):
            nv = fix_bg(val)
            if nv != val:
                decls.append(f'background: {nv}' if prop != 'background-image' else 'background-image: none')
        elif prop == 'color':
            nv = fix_color(val)
            if nv != val:
                decls.append(f'color: {nv}')
        elif prop.startswith('border') and ('rgba(0' in val or '#fff' in val or '#000000' in val):
            nv = fix_border(val)
            if nv != val:
                decls.append(f'{prop}: {nv}')
        elif prop == 'box-shadow' and ('#fff' in val or 'rgba(255' in val):
            decls.append('box-shadow: none')
        elif prop in ('-webkit-backdrop-filter', 'backdrop-filter'):
            decls.append(f'{prop}: none')
    if decls:
        sels = ', '.join(f'{SCOPE} {s.strip()}' for s in sel.split(','))
        out.append(f'{sels} {{ ' + '; '.join(d + ' !important' for d in decls) + '; }')

(R / 'src/css/85-edu-dark.css').write_text('\n'.join(out) + '\n')
print(len(out) - 1, 'règles générées')
