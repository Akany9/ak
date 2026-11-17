# Hôte natif de « Game 1 » : SDL3 (fenêtre, entrées) + bgfx (rendu) + Dear ImGui (interface), même pile que le Hub
# natif de PES Hub r88. La simulation est le cœur C++ de ../coeur, compilé ici en bibliothèque statique : EXACTEMENT
# le même code que celui qui tourne en WebAssembly sous three.js (empreinte identique, voir coeur/tests/determinisme.sh).
#
# Dépendances récupérées par FetchContent. Pour réutiliser les sources déjà présentes dans PES Hub r88
# (natif/third_party), ou des copies locales, passer par exemple :
#   -DFETCHCONTENT_SOURCE_DIR_SDL3=<r88>/natif/third_party/SDL -DFETCHCONTENT_SOURCE_DIR_IMGUI=<r88>/natif/third_party/imgui
# Les shaders (shaders/*.sc, syntaxe bgfx shaderc) sont compilés à la construction en en-têtes embarqués, pour chaque
# moteur de rendu de la plate-forme (Direct3D 11/12 sous Windows, OpenGL/Vulkan sous Linux, Metal sous macOS).
cmake_minimum_required(VERSION 3.20)
project(g1_natif C CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()
include(FetchContent)

# ---------------------------------------------------------------- SDL3 (statique, sous-systèmes inutiles coupés comme dans r88)
set(SDL_SHARED OFF CACHE BOOL "" FORCE)
set(SDL_STATIC ON CACHE BOOL "" FORCE)
set(SDL_TEST_LIBRARY OFF CACHE BOOL "" FORCE)
set(SDL_TESTS OFF CACHE BOOL "" FORCE)
set(SDL_EXAMPLES OFF CACHE BOOL "" FORCE)
set(SDL_AUDIO OFF CACHE BOOL "" FORCE)
set(SDL_CAMERA OFF CACHE BOOL "" FORCE)
set(SDL_HAPTIC OFF CACHE BOOL "" FORCE)
set(SDL_SENSOR OFF CACHE BOOL "" FORCE)
set(SDL_WAYLAND OFF CACHE BOOL "" FORCE)
set(SDL_X11_XTEST OFF CACHE BOOL "" FORCE)
set(SDL_GPU OFF CACHE BOOL "" FORCE)
set(SDL_RENDER OFF CACHE BOOL "" FORCE)
FetchContent_Declare(SDL3 GIT_REPOSITORY https://github.com/libsdl-org/SDL GIT_TAG release-3.4.20 GIT_SHALLOW TRUE)
# ---------------------------------------------------------------- bgfx (+ bx, bimg, shaderc) via bgfx.cmake
set(BGFX_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BGFX_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(BGFX_BUILD_TOOLS ON CACHE BOOL "" FORCE)
set(BGFX_BUILD_TOOLS_GEOMETRY OFF CACHE BOOL "" FORCE)
set(BGFX_BUILD_TOOLS_TEXTURE OFF CACHE BOOL "" FORCE)
set(BGFX_INSTALL OFF CACHE BOOL "" FORCE)
set(BGFX_CUSTOM_TARGETS OFF CACHE BOOL "" FORCE)
set(BGFX_WITH_WAYLAND OFF CACHE BOOL "" FORCE)
set(BGFX_CONFIG_MULTITHREADED OFF CACHE BOOL "" FORCE)   # comme r88 : un seul thread de rendu
set(BGFX_CONFIG_VIDEO OFF CACHE BOOL "" FORCE)
FetchContent_Declare(bgfx_cmake GIT_REPOSITORY https://github.com/bkaradzic/bgfx.cmake GIT_TAG v1.168.9624-612 GIT_SHALLOW TRUE)
# ---------------------------------------------------------------- Dear ImGui
FetchContent_Declare(imgui GIT_REPOSITORY https://github.com/ocornut/imgui GIT_TAG v1.92.0 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(SDL3 bgfx_cmake imgui)

add_library(imgui STATIC ${imgui_SOURCE_DIR}/imgui.cpp ${imgui_SOURCE_DIR}/imgui_draw.cpp ${imgui_SOURCE_DIR}/imgui_tables.cpp
  ${imgui_SOURCE_DIR}/imgui_widgets.cpp ${imgui_SOURCE_DIR}/backends/imgui_impl_sdl3.cpp)
target_include_directories(imgui PUBLIC ${imgui_SOURCE_DIR} ${imgui_SOURCE_DIR}/backends)
target_link_libraries(imgui PUBLIC SDL3::SDL3-static)

# ---------------------------------------------------------------- cœur de simulation (même sources que le WebAssembly)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../coeur ${CMAKE_BINARY_DIR}/coeur)

# ---------------------------------------------------------------- shaders → en-têtes embarqués
set(SHADERS_OUT ${CMAKE_BINARY_DIR}/shaders)
FetchContent_GetProperties(bgfx SOURCE_DIR BGFX_SRC)   # bgfx_shader.sh (déclaré par bgfx.cmake)
set(SH_INC INCLUDE_DIRS ${BGFX_SRC}/src)
bgfx_compile_shaders(TYPE VERTEX SHADERS shaders/vs_terrain.sc shaders/vs_instance.sc shaders/vs_couleur.sc
  VARYING_DEF ${CMAKE_CURRENT_SOURCE_DIR}/shaders/varying.def.sc OUTPUT_DIR ${SHADERS_OUT} OUT_FILES_VAR SH_VS ${SH_INC} AS_HEADERS)
bgfx_compile_shaders(TYPE FRAGMENT SHADERS shaders/fs_terrain.sc shaders/fs_instance.sc shaders/fs_couleur.sc
  VARYING_DEF ${CMAKE_CURRENT_SOURCE_DIR}/shaders/varying.def.sc OUTPUT_DIR ${SHADERS_OUT} OUT_FILES_VAR SH_FS ${SH_INC} AS_HEADERS)
bgfx_compile_shaders(TYPE VERTEX SHADERS shaders/vs_imgui.sc
  VARYING_DEF ${CMAKE_CURRENT_SOURCE_DIR}/shaders/varying_imgui.def.sc OUTPUT_DIR ${SHADERS_OUT} OUT_FILES_VAR SH_VI ${SH_INC} AS_HEADERS)
bgfx_compile_shaders(TYPE FRAGMENT SHADERS shaders/fs_imgui.sc
  VARYING_DEF ${CMAKE_CURRENT_SOURCE_DIR}/shaders/varying_imgui.def.sc OUTPUT_DIR ${SHADERS_OUT} OUT_FILES_VAR SH_FI ${SH_INC} AS_HEADERS)

# ---------------------------------------------------------------- application
add_executable(g1_natif src/main.cpp src/rendu_monde.cpp src/imgui_bgfx.cpp ${SH_VS} ${SH_FS} ${SH_VI} ${SH_FI})
target_include_directories(g1_natif PRIVATE src ${SHADERS_OUT})
target_link_libraries(g1_natif PRIVATE bgfx bx bimg imgui g1_coeur SDL3::SDL3-static)
if(MINGW)
  target_link_options(g1_natif PRIVATE -static -static-libgcc -static-libstdc++ -mwindows)
endif()
