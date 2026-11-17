#!/bin/sh
# Construit les cibles du cœur de simulation et lance les tests (même principe que gameplay_cpp/construire.sh de r88).
#   build/g1_sim, build/g1_tests     natif Linux                      gcc / g++ (C++20)
#   build/g1_coeur.wasm              prototype three.js (navigateur)   wasi-sdk 25 (outils/obtenir_wasi_sdk.sh, ou WASI_SDK=...)
#   build/g1_sim.exe, g1_coeur.dll   natif Windows                    x86_64-w64-mingw32 (si présent)
# Lua : graines internes figées (luai_makeseed, pivot de table.sort) pour un comportement identique sur toutes les cibles.
set -e
cd "$(dirname "$0")"
mkdir -p build/lua_nat build/lua_wasm
LUA_DEFS="-Dluai_makeseed(L)=0 -Dl_randomizePivot()=0"
FLAGS="-std=c++20 -O2 -DJSON_NOEXCEPTION -DSOL_NO_EXCEPTIONS=1 -Iinclude -Ithird_party -Ithird_party/lua"
# ---- natif
for f in third_party/lua/*.c; do o=build/lua_nat/$(basename $f .c).o; [ "$o" -nt "$f" ] || gcc -O2 -Dluai_makeseed\(L\)=0 -Dl_randomizePivot\(\)=0 -c $f -o $o; done
g++ $FLAGS src/*.cpp sim/g1_sim.cpp build/lua_nat/*.o -o build/g1_sim
g++ $FLAGS src/*.cpp tests/test_main.cpp build/lua_nat/*.o -o build/g1_tests
./build/g1_tests data
# ---- WebAssembly (setjmp/longjmp de Lua : exceptions WebAssembly, prises en charge par Node ≥ 17 et les navigateurs actuels)
WASI_SDK=${WASI_SDK:-outils/wasi-sdk}
if [ ! -x "$WASI_SDK/bin/clang" ]; then echo "wasi-sdk absent : lancer outils/obtenir_wasi_sdk.sh (cible WebAssembly ignorée)"; exit 0; fi
CC="$WASI_SDK/bin/clang --sysroot=$WASI_SDK/share/wasi-sysroot -mllvm -wasm-enable-sjlj -D_WASI_EMULATED_SIGNAL"
for f in third_party/lua/*.c; do o=build/lua_wasm/$(basename $f .c).o; [ "$o" -nt "$f" ] || $CC -O2 -Dluai_makeseed\(L\)=0 -Dl_randomizePivot\(\)=0 -c $f -o $o; done
$WASI_SDK/bin/clang++ --sysroot=$WASI_SDK/share/wasi-sysroot -mllvm -wasm-enable-sjlj $FLAGS -fno-exceptions \
  -mexec-model=reactor -Wl,--export-dynamic -Wl,--export=malloc -Wl,--export=free -Wl,--strip-debug \
  src/*.cpp web/wasm_stubs.cpp build/lua_wasm/*.o -lsetjmp -lwasi-emulated-signal -o build/g1_coeur.wasm
cp build/g1_coeur.wasm ../web/g1_coeur.wasm
mkdir -p ../web/data/scenarios ../web/data/scripts && cp data/*.json ../web/data/ && cp data/scenarios/*.json ../web/data/scenarios/ && cp data/scripts/*.lua ../web/data/scripts/
if command -v x86_64-w64-mingw32-g++ >/dev/null; then
  x86_64-w64-mingw32-g++ $FLAGS -static -static-libgcc -static-libstdc++ src/*.cpp sim/g1_sim.cpp third_party/lua/*.c -o build/g1_sim.exe
fi
ls -la build/*.wasm build/g1_sim build/g1_tests
