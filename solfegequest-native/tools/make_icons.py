#!/usr/bin/env python3
"""Sous-ensemble de la police d'icônes Lucide (ISC) → assets/Icons.ttf + src/icons.hpp.

  npm i --no-save lucide-static && python3 tools/make_icons.py node_modules/lucide-static
"""
import json
import pathlib
import sys

from fontTools import subset

R = pathlib.Path(__file__).resolve().parent.parent
lucide = pathlib.Path(sys.argv[1]) / 'font'
info = json.loads((lucide / 'info.json').read_text())

ICONS = {
    'MUSIC': 'music', 'MUSIC2': 'music-2', 'DRUM': 'drum', 'PIANO': 'piano', 'GUITAR': 'guitar', 'BARS': 'audio-lines',
    'VIOLIN': 'feather', 'WIND': 'wind', 'WAVE': 'audio-waveform', 'MIC': 'mic', 'GLOBE': 'globe', 'HOME': 'house',
    'CHEVRON_LEFT': 'chevron-left', 'CHEVRON_RIGHT': 'chevron-right', 'CHEVRON_DOWN': 'chevron-down', 'PLAY': 'play',
    'PAUSE': 'pause', 'STOP': 'square', 'SKIP_BACK': 'skip-back', 'RECORD': 'circle-dot', 'REPEAT': 'repeat',
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
}
cps = {}
for k, name in ICONS.items():
    code = int(info[name]['encodedCode'].lstrip('\\'), 16)
    cps[k] = code

opts = subset.Options()
opts.drop_tables += ['GSUB', 'GPOS']
opts.notdef_outline = True
font = subset.load_font(str(lucide / 'lucide.ttf'), opts)
sub = subset.Subsetter(opts)
sub.populate(unicodes=list(cps.values()))
sub.subset(font)
subset.save_font(font, str(R / 'assets/Icons.ttf'), opts)

lo, hi = min(cps.values()), max(cps.values())
lines = ['// Généré par tools/make_icons.py — icônes Lucide (licence ISC). Ne pas modifier à la main.',
         '#pragma once', f'#define ICON_MIN 0x{lo:04x}', f'#define ICON_MAX 0x{hi:04x}']
for k, c in cps.items():
    u = chr(c).encode('utf-8')
    lines.append(f'#define ICON_{k} "' + ''.join(f'\\x{b:02x}' for b in u) + '"')
(R / 'src/icons.hpp').write_text('\n'.join(lines) + '\n')
print(len(cps), 'icônes,', (R / 'assets/Icons.ttf').stat().st_size // 1024, 'Ko')
