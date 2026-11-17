#!/bin/sh
# Construit les cibles du cœur de simulation et lance les tests (même principe que gameplay_cpp/construire.sh de r88).
#   build/g1_sim, build/g1_tests     natif Linux                     g++
#   build/g1_coeur.wasm              prototype three.js (navigateur)  clang++ --target=wasm32-wasi (wasi-libc, libc++)
#   build/g1_sim.exe, g1_coeur.dll   natif Windows                   x86_64-w64-mingw32-g++ (si présent)
# Debian/Ubuntu : apt install clang lld wasi-libc libc++-dev-wasm32 libc++abi-dev-wasm32 libclang-rt-dev-wasm32
set -e
cd "$(dirname "$0")"
mkdir -p build
FLAGS="-std=c++17 -O2 -DJSON_NOEXCEPTION -Iinclude -Ithird_party"
g++ $FLAGS src/*.cpp sim/g1_sim.cpp -o build/g1_sim
g++ $FLAGS src/*.cpp tests/test_main.cpp -o build/g1_tests
./build/g1_tests data
WASI_SYSROOT=${WASI_SYSROOT:-/usr}
clang++ --target=wasm32-wasi --sysroot="$WASI_SYSROOT" -isystem "$WASI_SYSROOT/include/wasm32-wasi/c++/v1" $FLAGS -fno-exceptions \
  -mexec-model=reactor -Wl,--export-dynamic -Wl,--export=malloc -Wl,--export=free -Wl,--strip-debug \
  src/*.cpp web/wasm_stubs.cpp -o build/g1_coeur.wasm
cp build/g1_coeur.wasm ../web/g1_coeur.wasm
mkdir -p ../web/data/scenarios && cp data/*.json ../web/data/ && cp data/scenarios/*.json ../web/data/scenarios/
if command -v x86_64-w64-mingw32-g++ >/dev/null; then
  x86_64-w64-mingw32-g++ $FLAGS -static -static-libgcc -static-libstdc++ src/*.cpp sim/g1_sim.cpp -o build/g1_sim.exe
  x86_64-w64-mingw32-g++ $FLAGS -DG1_DLL -shared -static -static-libgcc -static-libstdc++ src/*.cpp -o build/g1_coeur.dll
fi
ls -la build
