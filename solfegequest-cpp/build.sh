#!/usr/bin/env bash
# Construit dist/SolfegeQuest.exe (Windows x64) par compilation croisée MinGW-w64,
# et, avec --test, un binaire Linux/macOS de test (dist/solfegequest-test).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist build
SRC="src/main.cpp src/http_server.cpp src/gunzip.cpp"
CXXFLAGS="-std=c++17 -O2 -Wall -Wextra"

if [[ "${1:-}" == "--test" ]]; then
  ${CXX:-g++} $CXXFLAGS -DSQ_RES_DIR="\"$PWD/res\"" $SRC src/assets_posix.cpp -pthread -o dist/solfegequest-test
  echo "dist/solfegequest-test"
  exit 0
fi

CROSS=${CROSS:-x86_64-w64-mingw32}
$CROSS-windres --codepage=65001 -I src -O coff res/app.rc -o build/app_res.o
$CROSS-g++ $CXXFLAGS -municode -mwindows -static -static-libgcc -static-libstdc++ -s \
  $SRC src/assets_win.cpp build/app_res.o \
  -lws2_32 -lshell32 -lole32 -luuid -o dist/SolfegeQuest.exe
ls -l dist/SolfegeQuest.exe
