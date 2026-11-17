// Rendu de Dear ImGui par bgfx : atlas de police RGBA (chemin « legacy » d'ImGui 1.92), tampons transitoires, ciseaux.
#include "imgui_bgfx.hpp"
#include <imgui.h>
#include <cstring>
#include "shaders_g1.hpp"

namespace imgui_bgfx {
static bgfx::VertexLayout s_layout; static bgfx::ProgramHandle s_prog = BGFX_INVALID_HANDLE;
static bgfx::UniformHandle s_tex = BGFX_INVALID_HANDLE; static bgfx::TextureHandle s_police = BGFX_INVALID_HANDLE;

void init() {
  s_layout.begin().add(bgfx::Attrib::Position, 2, bgfx::AttribType::Float).add(bgfx::Attrib::TexCoord0, 2, bgfx::AttribType::Float)
      .add(bgfx::Attrib::Color0, 4, bgfx::AttribType::Uint8, true).end();
  s_prog = g1shaders::programme("vs_imgui", "fs_imgui"); s_tex = bgfx::createUniform("s_tex", bgfx::UniformType::Sampler);
  ImGuiIO& io = ImGui::GetIO(); unsigned char* px; int w, h; io.Fonts->GetTexDataAsRGBA32(&px, &w, &h);
  s_police = bgfx::createTexture2D(uint16_t(w), uint16_t(h), false, 1, bgfx::TextureFormat::RGBA8, 0, bgfx::copy(px, uint32_t(w * h * 4)));
  io.Fonts->SetTexID(ImTextureID(s_police.idx));
}
void shutdown() { bgfx::destroy(s_police); bgfx::destroy(s_tex); bgfx::destroy(s_prog); }

void render(bgfx::ViewId vue, ImDrawData* dd) {
  if (!dd || dd->CmdListsCount == 0) return;
  const float W = dd->DisplaySize.x * dd->FramebufferScale.x, H = dd->DisplaySize.y * dd->FramebufferScale.y;
  bgfx::setViewName(vue, "ImGui"); bgfx::setViewMode(vue, bgfx::ViewMode::Sequential); bgfx::setViewRect(vue, 0, 0, uint16_t(W), uint16_t(H));
  float ortho[16] = {2.f / dd->DisplaySize.x, 0, 0, 0, 0, -2.f / dd->DisplaySize.y, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1};
  bgfx::setViewTransform(vue, nullptr, ortho);
  for (int n = 0; n < dd->CmdListsCount; ++n) {
    const ImDrawList* L = dd->CmdLists[n]; uint32_t nv = uint32_t(L->VtxBuffer.size()), ni = uint32_t(L->IdxBuffer.size());
    if (bgfx::getAvailTransientVertexBuffer(nv, s_layout) < nv || bgfx::getAvailTransientIndexBuffer(ni, sizeof(ImDrawIdx) == 4) < ni) break;
    bgfx::TransientVertexBuffer tvb; bgfx::TransientIndexBuffer tib;
    bgfx::allocTransientVertexBuffer(&tvb, nv, s_layout); bgfx::allocTransientIndexBuffer(&tib, ni, sizeof(ImDrawIdx) == 4);
    std::memcpy(tvb.data, L->VtxBuffer.Data, nv * sizeof(ImDrawVert)); std::memcpy(tib.data, L->IdxBuffer.Data, ni * sizeof(ImDrawIdx));
    for (const ImDrawCmd& c : L->CmdBuffer) {
      if (c.UserCallback) { c.UserCallback(L, &c); continue; }
      if (c.ElemCount == 0) continue;
      const float sx = dd->FramebufferScale.x, sy = dd->FramebufferScale.y;
      float x0 = (c.ClipRect.x - dd->DisplayPos.x) * sx, y0 = (c.ClipRect.y - dd->DisplayPos.y) * sy, x1 = (c.ClipRect.z - dd->DisplayPos.x) * sx, y1 = (c.ClipRect.w - dd->DisplayPos.y) * sy;
      if (x1 <= x0 || y1 <= y0) continue;
      bgfx::setScissor(uint16_t(x0 > 0 ? x0 : 0), uint16_t(y0 > 0 ? y0 : 0), uint16_t(x1 - (x0 > 0 ? x0 : 0)), uint16_t(y1 - (y0 > 0 ? y0 : 0)));
      bgfx::TextureHandle t = {uint16_t(c.GetTexID())};
      bgfx::setState(BGFX_STATE_WRITE_RGB | BGFX_STATE_WRITE_A | BGFX_STATE_MSAA | BGFX_STATE_BLEND_FUNC(BGFX_STATE_BLEND_SRC_ALPHA, BGFX_STATE_BLEND_INV_SRC_ALPHA));
      bgfx::setTexture(0, s_tex, t); bgfx::setVertexBuffer(0, &tvb, c.VtxOffset, nv); bgfx::setIndexBuffer(&tib, c.IdxOffset, c.ElemCount);
      bgfx::submit(vue, s_prog);
    }
  }
}
}  // namespace imgui_bgfx
