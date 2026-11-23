#!/usr/bin/env python3
"""Extrait l'application (HTML gzip) et l'icône PNG d'un ancien SolfegeQuest.exe (version Go)
vers res/, pour reconstruire la version C++ avec exactement la même interface.

Usage : python3 tools/extract_from_exe.py ancien/SolfegeQuest.exe
"""
import pathlib, sys, zlib

exe = pathlib.Path(sys.argv[1]).read_bytes()
res = pathlib.Path(__file__).resolve().parent.parent / "res"

# 1. le plus gros flux gzip contenant un document HTML = l'application
best = None
i = 0
while (i := exe.find(b"\x1f\x8b\x08", i)) >= 0:
    try:
        z = zlib.decompressobj(16 + 15)
        out = z.decompress(exe[i:])
        if z.eof and out.lstrip()[:15].lower().startswith(b"<!doctype html") and (not best or len(out) > best[2]):
            best = (i, len(exe) - i - len(z.unused_data), len(out))
    except zlib.error:
        pass
    i += 1
if not best:
    sys.exit("application HTML introuvable dans l'exécutable")
start, size, plain = best
(res / "app.html.gz").write_bytes(exe[start:start + size])
print(f"app.html.gz : {size} octets (HTML : {plain} octets)")

# 2. l'icône PNG servie en /icon.png est stockée juste avant (go:embed)
png = exe.rfind(b"\x89PNG\r\n\x1a\n", 0, start)
end = exe.find(b"IEND", png)
if png >= 0 and end > 0 and start - (end + 8) < 64:
    (res / "icon.png").write_bytes(exe[png:end + 8])
    print(f"icon.png : {end + 8 - png} octets")
else:
    print("icon.png non trouvée : res/icon.png conservée")
