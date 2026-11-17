#!/bin/sh
# Télécharge wasi-sdk 25 (clang 19 + wasi-libc avec setjmp/longjmp via les exceptions WebAssembly, nécessaire à Lua)
# dans coeur/outils/wasi-sdk. Linux x86_64 ; pour une autre plate-forme, voir https://github.com/WebAssembly/wasi-sdk/releases
set -e
cd "$(dirname "$0")"
[ -d wasi-sdk ] && { echo "wasi-sdk déjà présent"; exit 0; }
curl -sSL https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-25/wasi-sdk-25.0-x86_64-linux.tar.gz | tar xz
mv wasi-sdk-25.0-x86_64-linux wasi-sdk
echo "wasi-sdk installé dans $(pwd)/wasi-sdk"
