cmake_minimum_required(VERSION 3.22)
project(FinanceLab VERSION 1.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE Release)
endif()

option(FINANCELAB_WITH_PYTHON "Embarquer CPython (console Python, exercices Python, graphiques)" ON)
option(FINANCELAB_WITH_PDFIUM "Lecteur PDF en arrière-plan du tableau blanc (PDFium)" ON)
option(FINANCELAB_WITH_NFD    "Boîtes de dialogue natives (nativefiledialog-extended)" ON)
option(FINANCELAB_BUILD_TESTS "Compiler les tests du noyau" ON)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)

# ---- SQLite3 : bibliothèque système si présente, sinon amalgamation officielle
find_package(SQLite3 QUIET)
if(NOT SQLite3_FOUND)
  FetchContent_Declare(sqlite_amalgamation
    URL https://www.sqlite.org/2025/sqlite-amalgamation-3490100.zip)
  FetchContent_MakeAvailable(sqlite_amalgamation)
  add_library(sqlite3_local STATIC ${sqlite_amalgamation_SOURCE_DIR}/sqlite3.c)
  target_include_directories(sqlite3_local PUBLIC ${sqlite_amalgamation_SOURCE_DIR})
  add_library(SQLite::SQLite3 ALIAS sqlite3_local)
endif()

# ---- Noyau (sans interface) + tests
add_library(financelab_core INTERFACE)
target_include_directories(financelab_core INTERFACE src)
target_link_libraries(financelab_core INTERFACE SQLite::SQLite3)
if(FINANCELAB_WITH_PYTHON)
  find_package(Python3 COMPONENTS Development QUIET)
  if(Python3_Development_FOUND)
    target_compile_definitions(financelab_core INTERFACE FINANCELAB_WITH_PYTHON)
    target_link_libraries(financelab_core INTERFACE Python3::Python)
  else()
    message(WARNING "Python (en-têtes de développement) introuvable : console Python désactivée.")
  endif()
endif()

if(FINANCELAB_BUILD_TESTS)
  enable_testing()
  add_executable(core_tests tests/core_tests.cpp)
  target_link_libraries(core_tests PRIVATE financelab_core)
  add_test(NAME core_tests COMMAND core_tests)
endif()

# ---- Interface : SDL3 + Dear ImGui (docking) + NFD
set(SDL_SHARED OFF CACHE BOOL "" FORCE)
set(SDL_STATIC ON CACHE BOOL "" FORCE)
set(SDL_TEST_LIBRARY OFF CACHE BOOL "" FORCE)
FetchContent_Declare(SDL3 GIT_REPOSITORY https://github.com/libsdl-org/SDL.git GIT_TAG release-3.2.28 GIT_SHALLOW TRUE)
FetchContent_Declare(imgui GIT_REPOSITORY https://github.com/ocornut/imgui.git GIT_TAG v1.91.9-docking GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(SDL3 imgui)

find_package(OpenGL REQUIRED)
add_library(imgui_lib STATIC
  ${imgui_SOURCE_DIR}/imgui.cpp ${imgui_SOURCE_DIR}/imgui_draw.cpp ${imgui_SOURCE_DIR}/imgui_tables.cpp
  ${imgui_SOURCE_DIR}/imgui_widgets.cpp ${imgui_SOURCE_DIR}/imgui_demo.cpp
  ${imgui_SOURCE_DIR}/misc/cpp/imgui_stdlib.cpp
  ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl3.cpp ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp)
target_include_directories(imgui_lib PUBLIC ${imgui_SOURCE_DIR} ${imgui_SOURCE_DIR}/backends ${imgui_SOURCE_DIR}/misc/cpp)
target_link_libraries(imgui_lib PUBLIC SDL3::SDL3 OpenGL::GL)

add_executable(FinanceLab WIN32 src/main.cpp)
target_link_libraries(FinanceLab PRIVATE financelab_core imgui_lib)

if(FINANCELAB_WITH_NFD)
  FetchContent_Declare(nfd GIT_REPOSITORY https://github.com/btzy/nativefiledialog-extended.git GIT_TAG v1.2.1 GIT_SHALLOW TRUE)
  set(NFD_BUILD_TESTS OFF CACHE BOOL "" FORCE)
  set(NFD_INSTALL OFF CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(nfd)
  target_link_libraries(FinanceLab PRIVATE nfd)
  target_compile_definitions(FinanceLab PRIVATE FINANCELAB_HAS_NFD)
endif()


target_compile_definitions(FinanceLab PRIVATE FINANCELAB_ASSET_DIR="${CMAKE_SOURCE_DIR}/assets")
if(MSVC)
  target_compile_options(FinanceLab PRIVATE /utf-8)
endif()

# ---- Lecteur PDF : binaires précompilés PDFium (bblanchon/pdfium-binaries)
if(FINANCELAB_WITH_PDFIUM)
  set(_arch ${CMAKE_SYSTEM_PROCESSOR})
  if(WIN32)
    if(_arch STREQUAL "ARM64")
      set(_pdf_file pdfium-win-arm64.zip)
    else()
      set(_pdf_file pdfium-win-x64.zip)
    endif()
  elseif(APPLE)
    if(_arch STREQUAL "arm64")
      set(_pdf_file pdfium-mac-arm64.tgz)
    else()
      set(_pdf_file pdfium-mac-x64.tgz)
    endif()
  else()
    if(_arch MATCHES "aarch64|arm64")
      set(_pdf_file pdfium-linux-arm64.tgz)
    else()
      set(_pdf_file pdfium-linux-x64.tgz)
    endif()
  endif()
  FetchContent_Declare(pdfium_bin URL https://github.com/bblanchon/pdfium-binaries/releases/latest/download/${_pdf_file})
  FetchContent_MakeAvailable(pdfium_bin)
  set(PDFium_DIR ${pdfium_bin_SOURCE_DIR})
  find_package(PDFium REQUIRED)
  target_link_libraries(FinanceLab PRIVATE pdfium)
  target_compile_definitions(FinanceLab PRIVATE FINANCELAB_HAS_PDFIUM)
  if(UNIX AND NOT APPLE)
    set_target_properties(FinanceLab PROPERTIES BUILD_RPATH "$ORIGIN" INSTALL_RPATH "$ORIGIN")
  elseif(APPLE)
    set_target_properties(FinanceLab PROPERTIES BUILD_RPATH "@executable_path" INSTALL_RPATH "@executable_path")
  endif()
  add_custom_command(TARGET FinanceLab POST_BUILD COMMAND ${CMAKE_COMMAND} -E copy_if_different $<TARGET_FILE:pdfium> $<TARGET_FILE_DIR:FinanceLab>)
endif()

# Polices et dossier des supports de cours à côté de l'exécutable
add_custom_command(TARGET FinanceLab POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory ${CMAKE_SOURCE_DIR}/assets $<TARGET_FILE_DIR:FinanceLab>/assets
  COMMAND ${CMAKE_COMMAND} -E make_directory $<TARGET_FILE_DIR:FinanceLab>/courses)
