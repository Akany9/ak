// Rendu de Dear ImGui par bgfx (vue dédiée, tampons transitoires). Plate-forme : imgui_impl_sdl3.
#pragma once
#include <bgfx/bgfx.h>
struct ImDrawData;
namespace imgui_bgfx {
void init();
void shutdown();
void render(bgfx::ViewId vue, ImDrawData* dd);
}
