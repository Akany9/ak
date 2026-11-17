#include "rendu_monde.hpp"
#include <g1/api.h>
#include <algorithm>
#include <cmath>
#include <cstring>
#include "shaders_g1.hpp"

namespace {
// mêmes palettes que web/src/rendu/terrain.js et entites.js
const float BIOMES[7][4] = {{0.42f, 0.52f, 0.28f, 0}, {0.20f, 0.34f, 0.18f, 0}, {0.46f, 0.44f, 0.40f, 0}, {0.80f, 0.74f, 0.55f, 0}, {0.18f, 0.30f, 0.38f, 0}, {0.48f, 0.46f, 0.44f, 0}, {0.30f, 0.36f, 0.24f, 0}};
const uint32_t ROLE_COULEUR[11] = {0xb9a68f, 0xe8e2d8, 0x8d8a84, 0x9b9488, 0x6f7a5a, 0x7d7356, 0x6b6157, 0xa0a4a8, 0xc8b88a, 0x77706a, 0xb0b0a0};
const float MAT_TEINTE[6][3] = {{1.0f, 0.82f, 0.72f}, {0.92f, 0.92f, 0.9f}, {0.95f, 0.92f, 0.85f}, {0.8f, 0.62f, 0.42f}, {0.7f, 0.72f, 0.75f}, {1.0f, 0.9f, 0.75f}};

struct Inst { float m[16]; float c[4]; };
// matrice (colonnes) = T · Ry(lacet) · Rx(tangage) · S, convention three.js (lacet 0 : +z)
void trs(float* m, float x, float y, float z, float lacet, float tangage, float sx, float sy, float sz) {
  float cy = std::cos(lacet), sy_ = std::sin(lacet), cx = std::cos(tangage), sx_ = std::sin(tangage);
  // colonnes de Ry·Rx
  float X[3] = {cy, 0, -sy_}, Y[3] = {sy_ * sx_, cx, cy * sx_}, Z[3] = {sy_ * cx, -sx_, cy * cx};
  m[0] = X[0] * sx; m[1] = X[1] * sx; m[2] = X[2] * sx; m[3] = 0;
  m[4] = Y[0] * sy; m[5] = Y[1] * sy; m[6] = Y[2] * sy; m[7] = 0;
  m[8] = Z[0] * sz; m[9] = Z[1] * sz; m[10] = Z[2] * sz; m[11] = 0;
  m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
}
void couleur(float* c, uint32_t rgb, float k = 1, float a = 1) { c[0] = ((rgb >> 16) & 255) / 255.f * k; c[1] = ((rgb >> 8) & 255) / 255.f * k; c[2] = (rgb & 255) / 255.f * k; c[3] = a; }
struct PosV { float x, y, z; };
void boite(std::vector<PosV>& v, float w, float h, float d, float ox, float oy, float oz) {   // 12 triangles
  float x0 = ox - w / 2, x1 = ox + w / 2, y0 = oy - h / 2, y1 = oy + h / 2, z0 = oz - d / 2, z1 = oz + d / 2;
  PosV p[8] = {{x0, y0, z0}, {x1, y0, z0}, {x1, y1, z0}, {x0, y1, z0}, {x0, y0, z1}, {x1, y0, z1}, {x1, y1, z1}, {x0, y1, z1}};
  const int f[36] = {0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 3, 7, 6, 3, 6, 2, 0, 1, 5, 0, 5, 4};
  for (int i : f) v.push_back(p[i]);
}
}  // namespace

void RenduMonde::init() {
  lTerrain_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::TexCoord0, 2, bgfx::AttribType::Float).end();
  lPos_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).end();
  lCouleur_.begin().add(bgfx::Attrib::Position, 3, bgfx::AttribType::Float).add(bgfx::Attrib::Color0, 4, bgfx::AttribType::Uint8, true).end();
  pTerrain_ = g1shaders::programme("vs_terrain", "fs_terrain"); pInstance_ = g1shaders::programme("vs_instance", "fs_instance"); pCouleur_ = g1shaders::programme("vs_couleur", "fs_couleur");
  std::vector<PosV> b; boite(b, 1, 1, 1, 0, 0.5f, 0);   // boîte unité posée sur y = 0
  vbBoite_ = bgfx::createVertexBuffer(bgfx::copy(b.data(), uint32_t(b.size() * sizeof(PosV))), lPos_);
  std::vector<PosV> s;   // soldat low-poly : jambes, torse, tête, arme (comme entites.js)
  boite(s, 0.34f, 0.85f, 0.22f, 0, 0.42f, 0); boite(s, 0.46f, 0.62f, 0.28f, 0, 1.15f, 0); boite(s, 0.22f, 0.24f, 0.24f, 0, 1.6f, 0); boite(s, 0.06f, 0.06f, 0.9f, 0.18f, 1.25f, 0.35f);
  nSoldat_ = uint32_t(s.size()); vbSoldat_ = bgfx::createVertexBuffer(bgfx::copy(s.data(), uint32_t(s.size() * sizeof(PosV))), lPos_);
  auto U = [](const char* n, uint16_t k = 1) { return bgfx::createUniform(n, bgfx::UniformType::Vec4, k); };
  uMonde_ = U("u_monde"); uSoleil_ = U("u_soleil"); uCouleurSoleil_ = U("u_couleurSoleil"); uCiel_ = U("u_ciel"); uSol_ = U("u_sol"); uBrouillard_ = U("u_brouillard");
  uOeil_ = U("u_oeil"); uParams_ = U("u_params"); uBiomes_ = U("u_biomes", 7);
  sChaleur_ = bgfx::createUniform("s_chaleur", bgfx::UniformType::Sampler); sInc_ = bgfx::createUniform("s_incertitude", bgfx::UniformType::Sampler);
  majTerrain();
}

void RenduMonde::shutdown() {
  for (auto& t : tuiles_) if (bgfx::isValid(t.vb)) bgfx::destroy(t.vb);
  for (auto h : {uMonde_, uSoleil_, uCouleurSoleil_, uCiel_, uSol_, uBrouillard_, uOeil_, uParams_, uBiomes_, sChaleur_, sInc_}) bgfx::destroy(h);
  bgfx::destroy(vbBoite_); bgfx::destroy(vbSoldat_); bgfx::destroy(pTerrain_); bgfx::destroy(pInstance_); bgfx::destroy(pCouleur_);
  if (bgfx::isValid(tChaleur_)) bgfx::destroy(tChaleur_); if (bgfx::isValid(tInc_)) bgfx::destroy(tInc_);
}

void RenduMonde::majTerrain() {
  if (g1_terrain_revision() == revision_) return;
  revision_ = g1_terrain_revision(); n_ = g1_terrain_n(); cell_ = g1_terrain_cellule(); taille_ = g1_terrain_taille(); eau_ = g1_niveau_eau();
  const int w = n_ + 1; h_.assign(g1_terrain_hauteurs(), g1_terrain_hauteurs() + size_t(w) * w);
  std::vector<float> C(g1_cellules(), g1_cellules() + size_t(n_) * n_ * 4);
  for (auto& t : tuiles_) if (bgfx::isValid(t.vb)) bgfx::destroy(t.vb);
  tuiles_.clear(); const int k = std::max(1, int(std::lround(512.f / cell_))), nt = (n_ + k - 1) / k;
  auto X = [&](int i) { return -taille_ / 2 + i * cell_; };
  for (int tj = 0; tj < nt; ++tj)
    for (int ti = 0; ti < nt; ++ti) {   // triangulation identique à Monde::hauteur : (a, d, b) et (a, c, d)
      std::vector<float> v; int i0 = ti * k, j0 = tj * k, i1 = std::min(n_, i0 + k), j1 = std::min(n_, j0 + k);
      for (int j = j0; j < j1; ++j)
        for (int i = i0; i < i1; ++i) {
          float a[3] = {X(i), h_[j * w + i], X(j)}, b[3] = {X(i + 1), h_[j * w + i + 1], X(j)}, c[3] = {X(i), h_[(j + 1) * w + i], X(j + 1)}, d[3] = {X(i + 1), h_[(j + 1) * w + i + 1], X(j + 1)};
          float bio = C[(size_t(j) * n_ + i) * 4];
          for (const float* p : {a, d, b, a, c, d}) { v.insert(v.end(), {p[0], p[1], p[2], bio, 0.f}); }
        }
      Tuile t; t.n = uint32_t(v.size() / 5); t.cx = -taille_ / 2 + (i0 + i1) * 0.5f * cell_; t.cz = -taille_ / 2 + (j0 + j1) * 0.5f * cell_;
      t.vb = bgfx::createVertexBuffer(bgfx::copy(v.data(), uint32_t(v.size() * sizeof(float))), lTerrain_); tuiles_.push_back(t);
    }
  if (!bgfx::isValid(tChaleur_)) {
    tChaleur_ = bgfx::createTexture2D(uint16_t(n_), uint16_t(n_), false, 1, bgfx::TextureFormat::R8, BGFX_SAMPLER_U_CLAMP | BGFX_SAMPLER_V_CLAMP);
    tInc_ = bgfx::createTexture2D(uint16_t(n_), uint16_t(n_), false, 1, bgfx::TextureFormat::R8, BGFX_SAMPLER_U_CLAMP | BGFX_SAMPLER_V_CLAMP);
  }
}

void RenduMonde::majTextures(int heatmap, bool incertitude) {
  auto envoyer = [&](bgfx::TextureHandle t, const float* v) {
    const bgfx::Memory* m = bgfx::alloc(uint32_t(n_ * n_)); for (int i = 0; i < n_ * n_; ++i) m->data[i] = uint8_t(std::clamp(v[i], 0.f, 1.f) * 255);
    bgfx::updateTexture2D(t, 0, 0, 0, 0, uint16_t(n_), uint16_t(n_), m);
  };
  if (heatmap >= 0) envoyer(tChaleur_, g1_heatmap(heatmap));
  if (incertitude) envoyer(tInc_, g1_heatmap(6));
}

float RenduMonde::hauteur(float x, float z) const {
  const float* E = g1_etat(); const int w = n_ + 1;
  float fx = (x + E[8] + taille_ / 2) / cell_, fz = (z + E[9] + taille_ / 2) / cell_;
  fx = std::clamp(fx, 0.f, n_ - 1e-4f); fz = std::clamp(fz, 0.f, n_ - 1e-4f); int i = int(fx), j = int(fz); float u = fx - i, v = fz - j;
  float a = h_[j * w + i], b = h_[j * w + i + 1], c = h_[(j + 1) * w + i], d = h_[(j + 1) * w + i + 1];
  return u > v ? a + (b - a) * u + (d - b) * v : a + (d - c) * u + (c - a) * v;
}

void RenduMonde::uniformes(const float eye[3], const Eclairage& E) {
  const float* S = g1_etat(); float monde[4] = {taille_, S[8], S[9], 0}, oeil[4] = {eye[0], eye[1], eye[2], 0};
  bgfx::setUniform(uMonde_, monde); bgfx::setUniform(uOeil_, oeil); bgfx::setUniform(uSoleil_, E.soleil); bgfx::setUniform(uCouleurSoleil_, E.couleurSoleil);
  bgfx::setUniform(uCiel_, E.ciel); bgfx::setUniform(uSol_, E.sol); bgfx::setUniform(uBrouillard_, E.brouillard); bgfx::setUniform(uParams_, E.params);
}

void RenduMonde::dessiner(bgfx::ViewId vue, const float eye[3], const Eclairage& E, float echelle, bool toutesTuiles) {
  const float* S = g1_etat(); const float ox = S[8], oz = S[9];
  const uint64_t etatOpaque = BGFX_STATE_WRITE_RGB | BGFX_STATE_WRITE_A | BGFX_STATE_WRITE_Z | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_MSAA;
  // ---- terrain : tuiles actives seulement (streaming, ≤ 2 km du joueur, liste calculée par le cœur)
  std::vector<int> actives; const float* T = g1_tuiles(); const int nT = g1_tuiles_count();
  for (size_t t = 0; t < tuiles_.size(); ++t) {
    bool ok = toutesTuiles;
    for (int k = 0; k < nT && !ok; ++k) ok = std::fabs(T[k * 2] + ox - tuiles_[t].cx) < 1 && std::fabs(T[k * 2 + 1] + oz - tuiles_[t].cz) < 1;
    if (ok) actives.push_back(int(t));
  }
  float modele[16]; trs(modele, -ox, 0, -oz, 0, 0, 1, 1, 1);
  for (int t : actives) {
    uniformes(eye, E); bgfx::setUniform(uBiomes_, BIOMES, 7); bgfx::setTexture(0, sChaleur_, tChaleur_); bgfx::setTexture(1, sInc_, tInc_);
    bgfx::setTransform(modele); bgfx::setVertexBuffer(0, tuiles_[t].vb); bgfx::setState(etatOpaque); bgfx::submit(vue, pTerrain_);
  }
  // ---- instances : bâtiments (intact → endommagé → gravats), soldats, camions
  auto soumettre = [&](const std::vector<Inst>& v, bgfx::VertexBufferHandle vb, uint64_t etat) {
    if (v.empty()) return; uint32_t n = uint32_t(v.size()); if (bgfx::getAvailInstanceDataBuffer(n, sizeof(Inst)) < n) return;
    bgfx::InstanceDataBuffer idb; bgfx::allocInstanceDataBuffer(&idb, n, sizeof(Inst)); std::memcpy(idb.data, v.data(), n * sizeof(Inst));
    uniformes(eye, E); bgfx::setVertexBuffer(0, vb); bgfx::setInstanceDataBuffer(&idb); bgfx::setState(etat); bgfx::submit(vue, pInstance_);
  };
  std::vector<Inst> bat; const float* St = g1_structures(); const int nS = g1_structures_count();
  for (int i = 0; i < nS; ++i) {
    const float* s = St + i * G1_STRIDE_STRUCTURE; int etat = int(s[7]), role = int(s[8]), mat = std::clamp(int(s[11]), 0, 5); bool pont = role == 3;
    float h = etat == 2 ? std::max(0.6f, s[4] * 0.3f) : s[4]; Inst in;
    trs(in.m, s[0], s[1] - (pont ? 0 : 1), s[2], s[6], 0, s[3], h + (pont ? 0 : 1), s[5]);
    couleur(in.c, ROLE_COULEUR[std::clamp(role, 0, 10)]); for (int k = 0; k < 3; ++k) in.c[k] *= MAT_TEINTE[mat][k];
    if (etat == 1) for (int k = 0; k < 3; ++k) in.c[k] *= 0.72f;
    if (etat == 2) { in.c[0] = 0.35f; in.c[1] = 0.32f; in.c[2] = 0.3f; }
    bat.push_back(in);
  }
  soumettre(bat, vbBoite_, etatOpaque | BGFX_STATE_CULL_CW);
  std::vector<Inst> sol; const float* U = g1_unites(); const int nU = g1_unites_count(); lisse_.resize(size_t(nU) * 4, 1e30f); const int j = int(S[7]);
  for (int i = 0; i < nU; ++i) {
    const float* u = U + i * G1_STRIDE_UNITE; float* l = &lisse_[size_t(i) * 4];
    if (std::fabs(l[0] - u[0]) > 20 || std::fabs(l[2] - u[2]) > 20) { l[0] = u[0]; l[1] = u[1]; l[2] = u[2]; l[3] = u[3]; }
    const float k = 0.3f; l[0] += (u[0] - l[0]) * k; l[1] += (u[1] - l[1]) * k; l[2] += (u[2] - l[2]) * k;
    float da = std::atan2(std::sin(u[3] - l[3]), std::cos(u[3] - l[3])); l[3] += da * k;
    bool mort = u[8] == 4, couvert = u[14] == 1; Inst in;
    trs(in.m, l[0], l[1] + (mort ? 0.2f : 0), l[2], l[3], mort ? -1.5708f : 0, echelle, (couvert && !mort ? 0.68f : 1) * echelle, echelle);
    uint32_t c = 0x9a9a9a; int f = int(u[7]); if (f >= 0 && f < g1_factions_count()) c = uint32_t(g1_factions()[f * G1_STRIDE_FACTION + 22]);
    couleur(in.c, c, mort ? 0.35f : 1); if (i == j) { in.c[0] = std::min(1.f, in.c[0] + 0.3f); in.c[1] = std::min(1.f, in.c[1] + 0.25f); }
    sol.push_back(in); if (i == j) { joueur[0] = l[0]; joueur[1] = l[1]; joueur[2] = l[2]; joueur[3] = l[3]; }
  }
  soumettre(sol, vbSoldat_, etatOpaque);
  std::vector<Inst> cam; const float* Cv = g1_convois(); const int nC = g1_convois_count();
  for (int i = 0; i < nC; ++i) {
    const float* c = Cv + i * G1_STRIDE_CONVOI; if (c[7] == 1) continue; Inst in; trs(in.m, c[0], c[1], c[2], c[3], 0, 2.4f, 2.2f, 6.5f);
    int f = int(c[4]); couleur(in.c, c[7] == 2 ? 0x262220 : uint32_t(g1_factions()[f * G1_STRIDE_FACTION + 22])); cam.push_back(in);
  }
  soumettre(cam, vbBoite_, etatOpaque | BGFX_STATE_CULL_CW);
  // ---- lignes : routes drapées et traceurs des projectiles
  struct LV { float x, y, z; uint32_t abgr; }; std::vector<LV> L; const float* R = g1_routes(); const int nR = g1_routes_count();
  for (int i = 0; i < nR; ++i) {
    const float* r = R + i * G1_STRIDE_ROUTE; uint32_t c = r[4] ? 0xff3030c0 : 0x80c0d0d8;
    L.push_back({r[0], hauteur(r[0], r[1]) + 0.25f, r[1], c}); L.push_back({r[2], hauteur(r[2], r[3]) + 0.25f, r[3], c});
  }
  const float* P = g1_projectiles(); const int nP = g1_projectiles_count();
  for (int i = 0; i < nP; ++i) {
    const float* p = P + i * G1_STRIDE_PROJECTILE; float v = std::max(1.f, std::sqrt(p[3] * p[3] + p[4] * p[4] + p[5] * p[5])), l = std::min(12.f, v * 0.02f);
    L.push_back({p[0], p[1], p[2], 0xff7ad2ff}); L.push_back({p[0] - p[3] / v * l, p[1] - p[4] / v * l, p[2] - p[5] / v * l, 0x407ad2ff});
  }
  if (!L.empty() && bgfx::getAvailTransientVertexBuffer(uint32_t(L.size()), lCouleur_) >= L.size()) {
    bgfx::TransientVertexBuffer tvb; bgfx::allocTransientVertexBuffer(&tvb, uint32_t(L.size()), lCouleur_); std::memcpy(tvb.data, L.data(), L.size() * sizeof(LV));
    float id[16]; trs(id, 0, 0, 0, 0, 0, 1, 1, 1); bgfx::setTransform(id); bgfx::setVertexBuffer(0, &tvb);
    bgfx::setState(BGFX_STATE_WRITE_RGB | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_PT_LINES | BGFX_STATE_BLEND_ALPHA); bgfx::submit(vue, pCouleur_);
  }
  // ---- eau (dernière : transparente)
  if (eau_ > -1) {
    std::vector<Inst> e(1); trs(e[0].m, -ox, eau_ - 0.05f, -oz, 0, 0, taille_, 0.05f, taille_); couleur(e[0].c, 0x2a5a6e, 1, 0.82f);
    soumettre(e, vbBoite_, BGFX_STATE_WRITE_RGB | BGFX_STATE_DEPTH_TEST_LESS | BGFX_STATE_BLEND_ALPHA | BGFX_STATE_CULL_CW);
  }
}
