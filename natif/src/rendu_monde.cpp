#include "rendu_monde.hpp"
#include <g1/api.h>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <bx/math.h>
#include "shaders_g1.hpp"

namespace {
const uint32_t ROLE_COULEUR[11] = {0xb9a68f, 0xe8e2d8, 0x8d8a84, 0x9b9488, 0x6f7a5a, 0x7d7356, 0x6b6157, 0xa0a4a8, 0xc8b88a, 0x77706a, 0xb0b0a0};
const float MAT_TEINTE[6][3] = {{1.0f, 0.82f, 0.72f}, {0.92f, 0.92f, 0.9f}, {0.95f, 0.92f, 0.85f}, {0.8f, 0.62f, 0.42f}, {0.7f, 0.72f, 0.75f}, {1.0f, 0.9f, 0.75f}};
constexpr int CHUNK = 32;   // cellules par côté de chunk de rendu (document r88, § 7)

struct Inst { float m[16]; float c[4]; };
// matrice (colonnes) = T · Ry(lacet) · Rx(tangage) · S, convention three.js (lacet 0 : +z)
void trs(float* m, float x, float y, float z, float lacet, float tangage, float sx, float sy, float sz) {
  float cy = std::cos(lacet), sy_ = std::sin(lacet), cx = std::cos(tangage), sx_ = std::sin(tangage);
  float X[3] = {cy, 0, -sy_}, Y[3] = {sy_ * sx_, cx, cy * sx_}, Z[3] = {sy_ * cx, -sx_, cy * cx};
  for (int k = 0; k < 3; ++k) { m[k] = X[k] * sx; m[4 + k] = Y[k] * sy; m[8 + k] = Z[k] * sz; }
  m[3] = m[7] = m[11] = 0; m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
}
void couleur(float* c, uint32_t rgb, float k = 1, float a = 1) { c[0] = ((rgb >> 16) & 255) / 255.f * k; c[1] = ((rgb >> 8) & 255) / 255.f * k; c[2] = (rgb & 255) / 255.f * k; c[3] = a; }
void temperature(float* c, float t) { c[0] = c[1] = c[2] = t; c[3] = 1; }
struct PN { float x, y, z, nx, ny, nz; };
void boite(std::vector<PN>& v, float w, float h, float d, float ox, float oy, float oz) {   // 12 triangles, normales par face
  float x0 = ox - w / 2, x1 = ox + w / 2, y0 = oy - h / 2, y1 = oy + h / 2, z0 = oz - d / 2, z1 = oz + d / 2;
  float P[8][3] = {{x0, y0, z0}, {x1, y0, z0}, {x1, y1, z0}, {x0, y1, z0}, {x0, y0, z1}, {x1, y0, z1}, {x1, y1, z1}, {x0, y1, z1}};
  const int f[36] = {0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4};
  const float N[6][3] = {{0, 0, -1}, {0, 0, 1}, {-1, 0, 0}, {1, 0, 0}, {0, 1, 0}, {0, -1, 0}};
  for (int k = 0; k < 36; ++k) v.push_back({P[f[k]][0], P[f[k]][1], P[f[k]][2], N[k / 6][0], N[k / 6][1], N[k / 6][2]});
}
float bruitV(int x, int y, uint32_t g) { uint32_t h = uint32_t(x) * 374761393u + uint32_t(y) * 668265263u + g * 2246822519u; h = (h ^ (h >> 13)) * 1274126177u; return float((h ^ (h >> 16)) & 0xffff) / 65535.f; }
// couche de splatting procédurale (pas de texture externe) : couleur de base modulée par deux octaves de bruit
bgfx::TextureHandle couche(uint32_t graine, const float base[3], const float var[3], bool stries) {
  const int T = 128; const bgfx::Memory* m = bgfx::alloc(T * T * 4);
  for (int y = 0; y < T; ++y)
    for (int x = 0; x < T; ++x) {
      float a = bruitV(x / 8, y / 8, graine) * 0.6f + bruitV(x, y, graine + 1) * 0.4f; if (stries) a = 0.5f * a + 0.5f * (0.5f + 0.5f * std::sin(y * 0.35f + a * 4));
      for (int k = 0; k < 3; ++k) m->data[(y * T + x) * 4 + k] = uint8_t(std::clamp(base[k] + var[k] * (a - 0.5f), 0.f, 1.f) * 255);
      m->data[(y * T + x) * 4 + 3] = 255;
    }
  return bgfx::createTexture2D(T, T, false, 1, bgfx::TextureFormat::RGBA8, 0, m);   // échantillonneur : répétition (tuilage)
}
}  // namespace

void RenduMonde::init() {
  lTerrain_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::Color1, 4, bgfx::AttribType::Uint8, true).end();
  lPos_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::Normal, 3, bgfx::AttribType::Float).end();
  lCouleur_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::Color0, 4, bgfx::AttribType::Uint8, true).end();
  lEcran_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::TexCoord0, 2, bgfx::AttribType::Float).end();
  pTerrain_ = g1shaders::programme("vs_terrain", "fs_terrain"); pInstance_ = g1shaders::programme("vs_instance", "fs_instance");
  pCouleur_ = g1shaders::programme("vs_couleur", "fs_couleur"); pContour_ = g1shaders::programme("vs_outline", "fs_outline");
  pThermique_ = g1shaders::programme("vs_ecran", "fs_thermal"); pCopie_ = g1shaders::programme("vs_ecran", "fs_copie");
  std::vector<PN> b; boite(b, 1, 1, 1, 0, 0.5f, 0);
  vbBoite_ = bgfx::createVertexBuffer(bgfx::copy(b.data(), uint32_t(b.size() * sizeof(PN))), lPos_);
  std::vector<PN> s;   // soldat low-poly : jambes, torse, tête, arme (comme entites.js)
  boite(s, 0.34f, 0.85f, 0.22f, 0, 0.42f, 0); boite(s, 0.46f, 0.62f, 0.28f, 0, 1.15f, 0); boite(s, 0.22f, 0.24f, 0.24f, 0, 1.6f, 0); boite(s, 0.06f, 0.06f, 0.9f, 0.18f, 1.25f, 0.35f);
  vbSoldat_ = bgfx::createVertexBuffer(bgfx::copy(s.data(), uint32_t(s.size() * sizeof(PN))), lPos_);
  auto U = [](const char* n) { return bgfx::createUniform(n, bgfx::UniformType::Vec4); };
  auto S = [](const char* n) { return bgfx::createUniform(n, bgfx::UniformType::Sampler); };
  uMonde_ = U("u_monde"); uSoleil_ = U("u_soleil"); uCouleurSoleil_ = U("u_couleurSoleil"); uCiel_ = U("u_ciel"); uSol_ = U("u_sol"); uBrouillard_ = U("u_brouillard");
  uOeil_ = U("u_oeil"); uParams_ = U("u_params"); uMode_ = U("u_mode"); uContour_ = U("u_outline_params"); uThermique_ = U("u_thermalTimeParams");
  sChaleur_ = S("s_chaleur"); sInc_ = S("s_incertitude"); sCouches_[0] = S("s_layerGrass"); sCouches_[1] = S("s_layerDirt"); sCouches_[2] = S("s_layerRock"); sCouches_[3] = S("s_layerSnow");
  sGBuffer_ = S("s_gBufferThermal"); sBruit_ = S("s_noiseTex");
  const float herbe[3] = {0.40f, 0.50f, 0.27f}, vh[3] = {0.12f, 0.14f, 0.08f}, terre[3] = {0.47f, 0.40f, 0.31f}, vt[3] = {0.12f, 0.1f, 0.08f},
              roche[3] = {0.47f, 0.46f, 0.44f}, vr[3] = {0.18f, 0.18f, 0.17f}, neige[3] = {0.90f, 0.92f, 0.96f}, vn[3] = {0.06f, 0.06f, 0.05f};
  tCouches_[0] = couche(11, herbe, vh, false); tCouches_[1] = couche(23, terre, vt, false); tCouches_[2] = couche(37, roche, vr, true); tCouches_[3] = couche(41, neige, vn, false);
  { const bgfx::Memory* m = bgfx::alloc(64 * 64); for (int i = 0; i < 64 * 64; ++i) m->data[i] = uint8_t(bruitV(i % 64, i / 64, 97) * 255);
    tBruit_ = bgfx::createTexture2D(64, 64, false, 1, bgfx::TextureFormat::R8, 0, m); }
  majTerrain();
}

void RenduMonde::shutdown() {
  for (auto& c : chunks_) if (bgfx::isValid(c.vb)) bgfx::destroy(c.vb);
  for (auto h : {uMonde_, uSoleil_, uCouleurSoleil_, uCiel_, uSol_, uBrouillard_, uOeil_, uParams_, uMode_, uContour_, uThermique_, sChaleur_, sInc_, sCouches_[0], sCouches_[1], sCouches_[2], sCouches_[3], sGBuffer_, sBruit_}) bgfx::destroy(h);
  for (auto t : tCouches_) bgfx::destroy(t);
  bgfx::destroy(tBruit_); bgfx::destroy(vbBoite_); bgfx::destroy(vbSoldat_);
  for (auto p : {pTerrain_, pInstance_, pCouleur_, pContour_, pThermique_, pCopie_}) bgfx::destroy(p);
  if (bgfx::isValid(tChaleur_)) { bgfx::destroy(tChaleur_); bgfx::destroy(tInc_); }
  if (bgfx::isValid(fb_)) bgfx::destroy(fb_);
}

void RenduMonde::construireChunk(Chunk& c, bool creer) {   // triangulation identique à Monde::hauteur : (a, d, b) et (a, c, d)
  struct V { float x, y, z; uint8_t w[4]; }; std::vector<V> v; v.reserve(size_t(c.i1 - c.i0) * (c.j1 - c.j0) * 6); const int w = n_ + 1;
  auto X = [&](int i) { return -taille_ / 2 + i * cell_; };
  for (int j = c.j0; j < c.j1; ++j)
    for (int i = c.i0; i < c.i1; ++i) {
      const uint8_t* s = &splat_[(size_t(j) * n_ + i) * 4];
      const int A[2] = {i, j}, B[2] = {i + 1, j}, C[2] = {i, j + 1}, D[2] = {i + 1, j + 1};
      for (const int* p : {A, D, B, A, C, D}) v.push_back({X(p[0]), h_[p[1] * w + p[0]], X(p[1]), {s[0], s[1], s[2], s[3]}});
    }
  c.n = uint32_t(v.size());
  if (creer) c.vb = bgfx::createDynamicVertexBuffer(c.n, lTerrain_);
  bgfx::update(c.vb, 0, bgfx::copy(v.data(), uint32_t(v.size() * sizeof(V))));
}

void RenduMonde::majTerrain() {
  if (g1_terrain_revision() == revision_) return;
  const bool premier = revision_ < 0; revision_ = g1_terrain_revision();
  n_ = g1_terrain_n(); cell_ = g1_terrain_cellule(); taille_ = g1_terrain_taille(); eau_ = g1_niveau_eau(); const int w = n_ + 1;
  std::vector<float> h(g1_terrain_hauteurs(), g1_terrain_hauteurs() + size_t(w) * w); std::vector<uint8_t> s(g1_splatmap(), g1_splatmap() + size_t(n_) * n_ * 4);
  if (premier) {
    const int nc = (n_ + CHUNK - 1) / CHUNK;
    for (int cj = 0; cj < nc; ++cj)
      for (int ci = 0; ci < nc; ++ci) {
        Chunk c; c.i0 = ci * CHUNK; c.j0 = cj * CHUNK; c.i1 = std::min(n_, c.i0 + CHUNK); c.j1 = std::min(n_, c.j0 + CHUNK);
        c.cx = -taille_ / 2 + (c.i0 + c.i1) * 0.5f * cell_; c.cz = -taille_ / 2 + (c.j0 + c.j1) * 0.5f * cell_; c.rayon = CHUNK * cell_ * 0.7072f;
        chunks_.push_back(c);
      }
    h_.swap(h); splat_.swap(s); for (auto& c : chunks_) construireChunk(c, true); chunksMisAJour = int(chunks_.size());
    tChaleur_ = bgfx::createTexture2D(uint16_t(n_), uint16_t(n_), false, 1, bgfx::TextureFormat::R8, BGFX_SAMPLER_U_CLAMP | BGFX_SAMPLER_V_CLAMP);
    tInc_ = bgfx::createTexture2D(uint16_t(n_), uint16_t(n_), false, 1, bgfx::TextureFormat::R8, BGFX_SAMPLER_U_CLAMP | BGFX_SAMPLER_V_CLAMP);
    return;
  }
  // pinceau de terraformation : seuls les chunks dont un sommet ou un poids de splat a changé sont renvoyés au GPU
  chunksMisAJour = 0;
  for (auto& c : chunks_) {
    bool change = false;
    for (int j = c.j0; j <= c.j1 && !change; ++j) for (int i = c.i0; i <= c.i1 && !change; ++i) change = h[size_t(j) * w + i] != h_[size_t(j) * w + i];
    for (int j = c.j0; j < c.j1 && !change; ++j) change = std::memcmp(&s[(size_t(j) * n_ + c.i0) * 4], &splat_[(size_t(j) * n_ + c.i0) * 4], size_t(c.i1 - c.i0) * 4) != 0;
    if (change) { for (int j = c.j0; j <= c.j1; ++j) for (int i = c.i0; i <= c.i1; ++i) h_[size_t(j) * w + i] = h[size_t(j) * w + i];
                  for (int j = c.j0; j < c.j1; ++j) std::memcpy(&splat_[(size_t(j) * n_ + c.i0) * 4], &s[(size_t(j) * n_ + c.i0) * 4], size_t(c.i1 - c.i0) * 4);
                  construireChunk(c, false); ++chunksMisAJour; }
  }
}

void RenduMonde::majTextures(int heatmap, bool incertitude) {
  auto envoyer = [&](bgfx::TextureHandle t, const float* v) {
    const bgfx::Memory* m = bgfx::alloc(uint32_t(n_ * n_)); for (int i = 0; i < n_ * n_; ++i) m->data[i] = uint8_t(std::clamp(v[i], 0.f, 1.f) * 255);
    bgfx::updateTexture2D(t, 0, 0, 0, 0, uint16_t(n_), uint16_t(n_), m);
  };
  if (heatmap >= 0) envoyer(tChaleur_, g1_heatmap(heatmap));
  if (incertitude) { const float* v = g1_heatmap(6); inc_.assign(v, v + size_t(n_) * n_); envoyer(tInc_, v); }
}

float RenduMonde::hauteur(float x, float z) const {
  const float* E = g1_etat(); const int w = n_ + 1;
  float fx = (x + E[8] + taille_ / 2) / cell_, fz = (z + E[9] + taille_ / 2) / cell_;
  fx = std::clamp(fx, 0.f, n_ - 1e-4f); fz = std::clamp(fz, 0.f, n_ - 1e-4f); int i = int(fx), j = int(fz); float u = fx - i, v = fz - j;
  float a = h_[j * w + i], b = h_[j * w + i + 1], c = h_[(j + 1) * w + i], d = h_[(j + 1) * w + i + 1];
  return u > v ? a + (b - a) * u + (d - b) * v : a + (d - c) * u + (c - a) * v;
}

void RenduMonde::uniformes(const float eye[3], const Eclairage& E, float mode) {
  const float* S = g1_etat(); float monde[4] = {taille_, S[8], S[9], 0}, oeil[4] = {eye[0], eye[1], eye[2], 0}, m[4] = {mode, 0, 0, 0};
  bgfx::setUniform(uMonde_, monde); bgfx::setUniform(uOeil_, oeil); bgfx::setUniform(uSoleil_, E.soleil); bgfx::setUniform(uCouleurSoleil_, E.couleurSoleil);
  bgfx::setUniform(uCiel_, E.ciel); bgfx::setUniform(uSol_, E.sol); bgfx::setUniform(uBrouillard_, E.brouillard); bgfx::setUniform(uParams_, E.params); bgfx::setUniform(uMode_, m);
}

void RenduMonde::cible(int w, int h) {
  if (bgfx::isValid(fb_) && fbW_ == w && fbH_ == h) return;
  if (bgfx::isValid(fb_)) bgfx::destroy(fb_);
  const uint64_t rt = BGFX_TEXTURE_RT | BGFX_SAMPLER_U_CLAMP | BGFX_SAMPLER_V_CLAMP;
  fbCouleur_ = bgfx::createTexture2D(uint16_t(w), uint16_t(h), false, 1, bgfx::TextureFormat::RGBA8, rt);
  bgfx::TextureHandle prof = bgfx::createTexture2D(uint16_t(w), uint16_t(h), false, 1, bgfx::TextureFormat::D24S8, BGFX_TEXTURE_RT_WRITE_ONLY);
  bgfx::TextureHandle att[2] = {fbCouleur_, prof}; fb_ = bgfx::createFrameBuffer(2, att, true); fbW_ = w; fbH_ = h;
}

void RenduMonde::dessiner(const OptionsRendu& o, const Eclairage& E) {
  const float* S = g1_etat(); const float ox = S[8], oz = S[9]; const float th = o.flir ? 1.f : 0.f;
  cible(o.largeur, o.hauteur);
  uint32_t fond = o.flir ? 0x101010ff : (uint32_t(E.brouillard[0] * 255) << 24) | (uint32_t(E.brouillard[1] * 255) << 16) | (uint32_t(E.brouillard[2] * 255) << 8) | 0xff;
  for (bgfx::ViewId v : {VUE_SCENE, VUE_CONTOUR}) { bgfx::setViewFrameBuffer(v, fb_); bgfx::setViewRect(v, 0, 0, uint16_t(o.largeur), uint16_t(o.hauteur)); bgfx::setViewTransform(v, o.view, o.proj); }
  bgfx::setViewClear(VUE_SCENE, BGFX_CLEAR_COLOR | BGFX_CLEAR_DEPTH | BGFX_CLEAR_STENCIL, fond, 1.0f, 0); bgfx::setViewClear(VUE_CONTOUR, BGFX_CLEAR_NONE);
  bgfx::setViewName(VUE_SCENE, "scene"); bgfx::setViewName(VUE_CONTOUR, "contours"); bgfx::touch(VUE_SCENE); bgfx::touch(VUE_CONTOUR);
  float vp[16]; bx::mtxMul(vp, o.view, o.proj); culler_.extract_planes(vp);
  const uint64_t opaque = BGFX_STATE_WRITE_RGB | BGFX_STATE_WRITE_A | BGFX_STATE_WRITE_Z | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_MSAA;

  // ---- terrain : chunks dans le rayon d'action (streaming) et dans le frustum
  float modele[16]; trs(modele, -ox, 0, -oz, 0, 0, 1, 1, 1); const float rayon = S[37] > 0 ? S[37] : 900; chunksVisibles = 0;
  for (auto& c : chunks_) {
    float lx = c.cx - ox, lz = c.cz - oz;
    if (!o.toutesTuiles && std::hypot(lx - joueur[0], lz - joueur[2]) > rayon + c.rayon) continue;
    AABB box{{lx - c.rayon, -100.f, lz - c.rayon}, {lx + c.rayon, 3000.f, lz + c.rayon}}; if (!culler_.test_aabb(box)) continue;
    ++chunksVisibles; uniformes(o.eye, E, th);
    bgfx::setTexture(0, sChaleur_, tChaleur_); bgfx::setTexture(1, sInc_, tInc_); for (int k = 0; k < 4; ++k) bgfx::setTexture(uint8_t(2 + k), sCouches_[k], tCouches_[k]);
    bgfx::setTransform(modele); bgfx::setVertexBuffer(0, c.vb); bgfx::setState(opaque); bgfx::submit(VUE_SCENE, pTerrain_);
  }
  auto soumettre = [&](bgfx::ViewId vue, bgfx::ProgramHandle prog, const std::vector<Inst>& v, bgfx::VertexBufferHandle vb, uint64_t etat, uint32_t stencil = BGFX_STENCIL_NONE) {
    if (v.empty()) return; uint32_t n = uint32_t(v.size()); if (bgfx::getAvailInstanceDataBuffer(n, sizeof(Inst)) < n) return;
    bgfx::InstanceDataBuffer idb; bgfx::allocInstanceDataBuffer(&idb, n, sizeof(Inst)); std::memcpy(idb.data, v.data(), n * sizeof(Inst));
    uniformes(o.eye, E, th); bgfx::setVertexBuffer(0, vb); bgfx::setInstanceDataBuffer(&idb); bgfx::setState(etat); bgfx::setStencil(stencil); bgfx::submit(vue, prog);
  };
  // ---- bâtiments : un nœud du SceneGraph par structure (poignées générationnelles), AABB monde, frustum culling
  const float* St = g1_structures(); const int nS = g1_structures_count();
  if (int(noeudsBatiments_.size()) != nS) { scene_.clear(); noeudsBatiments_.clear(); for (int i = 0; i < nS; ++i) { Handle h = scene_.create_node(); scene_.get(h)->user = uint32_t(i); noeudsBatiments_.push_back(h); } }
  std::vector<Inst> bat; batimentsVisibles = batimentsCulles = 0;
  for (int i = 0; i < nS; ++i) {
    const float* s = St + i * G1_STRIDE_STRUCTURE; int etat = int(s[7]), role = int(s[8]), mat = std::clamp(int(s[11]), 0, 5); bool pont = role == 3;
    float h = etat == 2 ? std::max(0.6f, s[4] * 0.3f) : s[4]; SceneNode* nd = scene_.get(noeudsBatiments_[i]);
    trs(nd->transform, s[0], s[1] - (pont ? 0 : 1), s[2], s[6], 0, s[3], h + (pont ? 0 : 1), s[5]);
    float r = std::hypot(s[3], s[5]) * 0.5f; nd->world_bounds = {{s[0] - r, s[1] - 1, s[2] - r}, {s[0] + r, s[1] + h, s[2] + r}};
    if (!culler_.test_aabb(nd->world_bounds)) { ++batimentsCulles; continue; }
    ++batimentsVisibles; Inst in; std::memcpy(in.m, nd->transform, sizeof in.m);
    if (o.flir) temperature(in.c, s[12]);
    else {
      couleur(in.c, ROLE_COULEUR[std::clamp(role, 0, 10)]); for (int k = 0; k < 3; ++k) in.c[k] *= MAT_TEINTE[mat][k];
      if (etat == 1) for (int k = 0; k < 3; ++k) in.c[k] *= 0.72f;
      if (etat == 2) { in.c[0] = 0.35f; in.c[1] = 0.32f; in.c[2] = 0.3f; }
    }
    bat.push_back(in);
  }
  soumettre(VUE_SCENE, pInstance_, bat, vbBoite_, opaque | BGFX_STATE_CULL_CW);
  // ---- unités : passe normale (écrit stencil = 1), puis contours à travers les murs pour l'escouade et les ennemis repérés
  std::vector<Inst> sol, contour; const float* U = g1_unites(); const int nU = g1_unites_count(); lisse_.resize(size_t(nU) * 4, 1e30f);
  const int j = int(S[7]), fj = int(S[16]); const float* F = g1_factions();
  for (int i = 0; i < nU; ++i) {
    const float* u = U + i * G1_STRIDE_UNITE; float* l = &lisse_[size_t(i) * 4];
    if (std::fabs(l[0] - u[0]) > 20 || std::fabs(l[2] - u[2]) > 20) { l[0] = u[0]; l[1] = u[1]; l[2] = u[2]; l[3] = u[3]; }
    const float k = 0.3f; l[0] += (u[0] - l[0]) * k; l[1] += (u[1] - l[1]) * k; l[2] += (u[2] - l[2]) * k; l[3] += std::atan2(std::sin(u[3] - l[3]), std::cos(u[3] - l[3])) * k;
    if (i == j) { joueur[0] = l[0]; joueur[1] = l[1]; joueur[2] = l[2]; joueur[3] = l[3]; }
    bool mort = u[8] == 4, couvert = u[14] == 1; Inst in;
    trs(in.m, l[0], l[1] + (mort ? 0.2f : 0), l[2], l[3], mort ? -1.5708f : 0, o.echelleUnites, (couvert && !mort ? 0.68f : 1) * o.echelleUnites, o.echelleUnites);
    AABB box{{l[0] - 1.5f * o.echelleUnites, l[1] - 1, l[2] - 1.5f * o.echelleUnites}, {l[0] + 1.5f * o.echelleUnites, l[1] + 2 * o.echelleUnites, l[2] + 1.5f * o.echelleUnites}};
    if (!culler_.test_aabb(box)) continue;
    int f = int(u[7]); uint32_t c = (f >= 0 && f < g1_factions_count()) ? uint32_t(F[f * G1_STRIDE_FACTION + 22]) : 0x9a9a9a;
    if (o.flir) temperature(in.c, u[17]); else { couleur(in.c, c, mort ? 0.35f : 1); if (i == j) { in.c[0] = std::min(1.f, in.c[0] + 0.3f); in.c[1] = std::min(1.f, in.c[1] + 0.25f); } }
    sol.push_back(in);
    if (o.contours && !mort && i != j && !inc_.empty()) {   // escouade du joueur (bleu) ; ennemi repéré = cellule confirmée par le brouillard d'information (rouge)
      int ci = int((u[0] + ox + taille_ / 2) / cell_), cj = int((u[2] + oz + taille_ / 2) / cell_); bool repere = ci >= 0 && cj >= 0 && ci < n_ && cj < n_ && inc_[size_t(cj) * n_ + ci] < 0.01f;
      if (f == fj || repere) { Inst e = in; if (f == fj) couleur(e.c, 0x4aa3ff, 1, 0.75f); else couleur(e.c, 0xff4a3a, 1, 0.75f); contour.push_back(e); }
    }
  }
  const uint32_t stencilEcrit = BGFX_STENCIL_TEST_ALWAYS | BGFX_STENCIL_FUNC_REF(1) | BGFX_STENCIL_FUNC_RMASK(0xff) | BGFX_STENCIL_OP_FAIL_S_KEEP | BGFX_STENCIL_OP_FAIL_Z_KEEP | BGFX_STENCIL_OP_PASS_Z_REPLACE;
  soumettre(VUE_SCENE, pInstance_, sol, vbSoldat_, opaque, stencilEcrit);
  if (!o.flir) {
    float p[4] = {2.5f, 0, 0, 0}; bgfx::setUniform(uContour_, p);
    const uint32_t stencilContour = BGFX_STENCIL_TEST_NOTEQUAL | BGFX_STENCIL_FUNC_REF(1) | BGFX_STENCIL_FUNC_RMASK(0xff) | BGFX_STENCIL_OP_FAIL_S_KEEP | BGFX_STENCIL_OP_FAIL_Z_KEEP | BGFX_STENCIL_OP_PASS_Z_KEEP;
    soumettre(VUE_CONTOUR, pContour_, contour, vbSoldat_, BGFX_STATE_WRITE_RGB | BGFX_STATE_WRITE_A | BGFX_STATE_DEPTH_TEST_GREATER | BGFX_STATE_BLEND_ALPHA, stencilContour);
  }
  // ---- camions
  std::vector<Inst> cam; const float* Cv = g1_convois(); const int nC = g1_convois_count();
  for (int i = 0; i < nC; ++i) {
    const float* c = Cv + i * G1_STRIDE_CONVOI; if (c[7] == 1) continue; Inst in; trs(in.m, c[0], c[1], c[2], c[3], 0, 2.4f, 2.2f, 6.5f);
    int f = int(c[4]); if (o.flir) temperature(in.c, c[7] == 2 ? 1.f : 0.75f); else couleur(in.c, c[7] == 2 ? 0x262220 : uint32_t(F[f * G1_STRIDE_FACTION + 22])); cam.push_back(in);
  }
  soumettre(VUE_SCENE, pInstance_, cam, vbBoite_, opaque | BGFX_STATE_CULL_CW);
  // ---- lignes : routes drapées et traceurs des projectiles
  struct LV { float x, y, z; uint32_t abgr; }; std::vector<LV> L; const float* R = g1_routes(); const int nR = g1_routes_count();
  if (!o.flir) for (int i = 0; i < nR; ++i) {
    const float* r = R + i * G1_STRIDE_ROUTE; uint32_t c = r[4] ? 0xff3030c0 : 0x80c0d0d8;
    L.push_back({r[0], hauteur(r[0], r[1]) + 0.25f, r[1], c}); L.push_back({r[2], hauteur(r[2], r[3]) + 0.25f, r[3], c});
  }
  const float* P = g1_projectiles(); const int nP = g1_projectiles_count();
  for (int i = 0; i < nP; ++i) {
    const float* p = P + i * G1_STRIDE_PROJECTILE; float v = std::max(1.f, std::sqrt(p[3] * p[3] + p[4] * p[4] + p[5] * p[5])), l = std::min(12.f, v * 0.02f);
    L.push_back({p[0], p[1], p[2], o.flir ? 0xffffffffu : 0xff7ad2ffu}); L.push_back({p[0] - p[3] / v * l, p[1] - p[4] / v * l, p[2] - p[5] / v * l, o.flir ? 0x80ffffffu : 0x407ad2ffu});
  }
  if (!L.empty() && bgfx::getAvailTransientVertexBuffer(uint32_t(L.size()), lCouleur_) >= L.size()) {
    bgfx::TransientVertexBuffer tvb; bgfx::allocTransientVertexBuffer(&tvb, uint32_t(L.size()), lCouleur_); std::memcpy(tvb.data, L.data(), L.size() * sizeof(LV));
    float id[16]; trs(id, 0, 0, 0, 0, 0, 1, 1, 1); bgfx::setTransform(id); bgfx::setVertexBuffer(0, &tvb);
    bgfx::setState(BGFX_STATE_WRITE_RGB | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_PT_LINES | BGFX_STATE_BLEND_ALPHA); bgfx::submit(VUE_SCENE, pCouleur_);
  }
  // ---- eau (dernière : transparente ; froide en thermique)
  if (eau_ > -1) {
    std::vector<Inst> e(1); trs(e[0].m, -ox, eau_ - 0.05f, -oz, 0, 0, taille_, 0.05f, taille_); if (o.flir) temperature(e[0].c, 0.05f); else couleur(e[0].c, 0x2a5a6e, 1, 0.82f);
    soumettre(VUE_SCENE, pInstance_, e, vbBoite_, BGFX_STATE_WRITE_RGB | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_BLEND_ALPHA | BGFX_STATE_CULL_CW);
  }
  // ---- post-traitement vers l'écran : copie, ou vision thermique FLIR
  bgfx::setViewName(VUE_POST, "post"); bgfx::setViewRect(VUE_POST, 0, 0, uint16_t(o.largeur), uint16_t(o.hauteur)); bgfx::setViewTransform(VUE_POST, nullptr, nullptr);
  bgfx::setViewClear(VUE_POST, BGFX_CLEAR_NONE); bgfx::touch(VUE_POST);
  if (bgfx::getAvailTransientVertexBuffer(3, lEcran_) == 3) {
    const bool bas = bgfx::getCaps()->originBottomLeft; struct E5 { float x, y, z, u, v; };
    E5 tri[3] = {{-1, -1, 0, 0, bas ? 0.f : 1.f}, {3, -1, 0, 2, bas ? 0.f : 1.f}, {-1, 3, 0, 0, bas ? 2.f : -1.f}};   // triangle plein écran
    bgfx::TransientVertexBuffer tvb; bgfx::allocTransientVertexBuffer(&tvb, 3, lEcran_); std::memcpy(tvb.data, tri, sizeof tri);
    float tp[4] = {o.temps, 3.0f, 0, 0}; bgfx::setUniform(uThermique_, tp);
    bgfx::setTexture(0, sGBuffer_, fbCouleur_); bgfx::setTexture(1, sBruit_, tBruit_);
    bgfx::setVertexBuffer(0, &tvb); bgfx::setState(BGFX_STATE_WRITE_RGB | BGFX_STATE_WRITE_A); bgfx::submit(VUE_POST, o.flir ? pThermique_ : pCopie_);
  }
}
