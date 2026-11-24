#!/usr/bin/env bash
# ./build.sh → dist/SolfegeQuest.exe (Windows x64, MinGW-w64) ; ./build.sh --linux → dist/solfegequest (tests)
set -euo pipefail
cd "$(dirname "$0")"
make -j"$(nproc)" "$([[ "${1:-}" == "--linux" ]] && echo linux || echo win)"
