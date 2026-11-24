#!/usr/bin/env python3
"""Icônes SVG Lucide (licence ISC) → src/icons.hpp (codes) + src/icons_svg.inc (sources SVG).

Les icônes ne passent plus par une police : leurs tracés SVG sont embarqués et rendus par
src/svgicons.cpp (vectoriel pour les grandes tailles, rastérisé pixel pour pixel à la taille exacte
du texte pour les icônes en ligne) → toujours nettes, quelle que soit l'échelle.

  npm i --no-save lucide-static && python3 tools/make_icons.py node_modules/lucide-static
"""
import pathlib
import re
import sys

R = pathlib.Path(__file__).resolve().parent.parent
icons_dir = pathlib.Path(sys.argv[1]) / 'icons'

ICONS = {
    'MUSIC': 'music', 'MUSIC2': 'music-2', 'DRUM': 'drum', 'PIANO': 'piano', 'GUITAR': 'guitar', 'BARS': 'audio-lines',
    'VIOLIN': 'feather', 'WIND': 'wind', 'WAVE': 'audio-waveform', 'MIC': 'mic', 'GLOBE': 'globe', 'HOME': 'house',
    'CHEVRON_LEFT': 'chevron-left', 'CHEVRON_RIGHT': 'chevron-right', 'CHEVRON_DOWN': 'chevron-down', 'CHEVRON_UP': 'chevron-up',
    'PLAY': 'play', 'PAUSE': 'pause', 'STOP': 'square', 'SKIP_BACK': 'skip-back', 'RECORD': 'circle-dot', 'REPEAT': 'repeat',
    'METRONOME': 'timer', 'UNDO': 'undo-2', 'REDO': 'redo-2', 'PLUS': 'plus', 'MINUS': 'minus', 'X': 'x',
    'TRASH': 'trash-2', 'COPY': 'copy', 'PENCIL': 'pencil', 'PALETTE': 'palette', 'DROPLET': 'droplet',
    'BROWSER': 'library', 'PLAYLIST': 'list-music', 'MIXER': 'sliders-vertical', 'SLIDERS': 'sliders-horizontal',
    'KEYBOARD': 'keyboard-music', 'SCORE': 'file-music', 'CHORDS': 'layers', 'GRID': 'grid-3x3', 'PIN': 'pin',
    'UNPIN': 'pin-off', 'DETACH': 'picture-in-picture-2', 'DOCK': 'panel-bottom', 'RESET': 'rotate-ccw', 'SAVE': 'save',
    'OPEN': 'folder-open', 'NEW': 'file-plus', 'GRAD': 'graduation-cap', 'BOOK': 'book-open', 'TARGET': 'target',
    'ZOOM_IN': 'zoom-in', 'ZOOM_OUT': 'zoom-out', 'MAGNET': 'magnet', 'ERASER': 'eraser', 'POINTER': 'mouse-pointer-2',
    'VOLUME': 'volume-2', 'HEADPHONES': 'headphones', 'INFO': 'info', 'BAN': 'ban', 'CHECK': 'check',
    'LAYOUT': 'layout-dashboard', 'EYE': 'eye', 'EYE_OFF': 'eye-off', 'TUNER': 'gauge', 'SPEAKER': 'speaker',
    'MORE': 'ellipsis', 'MAXIMIZE': 'maximize-2', 'MINIMIZE': 'minimize-2', 'LOOP': 'refresh-cw', 'ZAP': 'zap',
    'STEP': 'footprints', 'KEYS': 'keyboard',
    # version 1.6 : programme du cours, barre du haut, Studio
    'ACTIVITY': 'activity', 'CLOCK': 'clock', 'HASH': 'hash', 'TRENDING': 'trending-up', 'ARROW_UR': 'arrow-up-right',
    'COMPASS': 'compass', 'AWARD': 'award', 'LIST': 'list', 'FOLDER': 'folder', 'SHARE': 'share', 'HELP': 'circle-help',
    'PLUG': 'plug', 'SEARCH': 'search', 'SPARK': 'sparkles', 'PANEL_LEFT': 'panel-left', 'CIRCLE_PLAY': 'circle-play',
}
BASE = 0xEA00
lines = ['// Généré par tools/make_icons.py — icônes Lucide (licence ISC) au format SVG. Ne pas modifier à la main.',
         '#pragma once', f'#define ICON_MIN 0x{BASE:04x}', f'#define ICON_MAX 0x{BASE + len(ICONS) - 1:04x}']
inc = ['// Généré par tools/make_icons.py — sources SVG des icônes Lucide (licence ISC).']
for i, (k, name) in enumerate(ICONS.items()):
    cp = BASE + i
    u = chr(cp).encode('utf-8')
    lines.append(f'#define ICON_{k} "' + ''.join(f'\\x{b:02x}' for b in u) + '"')
    svg = (icons_dir / f'{name}.svg').read_text()
    body = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    body = re.sub(r'^[\s\S]*?<svg[^>]*>', '', body).replace('</svg>', '')
    body = ' '.join(body.split())
    inc.append(f'{{0x{cp:04x}, R"svg({body})svg"}},  // {name}')
(R / 'src/icons.hpp').write_text('\n'.join(lines) + '\n')
(R / 'src/icons_svg.inc').write_text('\n'.join(inc) + '\n')
print(len(ICONS), 'icônes SVG')
