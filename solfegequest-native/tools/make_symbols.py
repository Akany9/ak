#!/usr/bin/env python3
"""Sous-ensemble de DejaVu Sans (licence Bitstream Vera / domaine public) : ♭ ♮ ♯, ≈ ≤ ≥ et quelques flèches,
fusionné dans les polices d'interface (Inter n'a pas ces caractères).
  python3 tools/make_symbols.py /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
"""
import pathlib
import sys

from fontTools import subset

R = pathlib.Path(__file__).resolve().parent.parent
opts = subset.Options()
opts.drop_tables += ['GSUB', 'GPOS']
font = subset.load_font(sys.argv[1], opts)
sub = subset.Subsetter(opts)
sub.populate(unicodes=[0x266D, 0x266E, 0x266F, 0x2190, 0x2191, 0x2192, 0x2193, 0x2194, 0x21BB, 0x2022, 0x2026, 0x2248, 0x2264, 0x2265])
sub.subset(font)
subset.save_font(font, str(R / 'assets/Symbols.ttf'), opts)
print((R / 'assets/Symbols.ttf').stat().st_size, 'octets')
