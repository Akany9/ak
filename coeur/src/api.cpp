// Interface C : recopie l'état du Monde dans des tableaux plats de float (relatifs à l'origine flottante) que l'hôte lit
// par pointeur — vue Float32Array sur la mémoire WebAssembly côté three.js, lecture directe côté bgfx.
#include "g1/api.h"
#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <memory>
#include "g1/monde.hpp"

using namespace g1;
namespace {
Donnees g_d; std::unique_ptr<Monde> g_m; std::string g_err, g_warn, g_ev, g_tmp;
std::vector<float> b_unites, b_struct, b_proj, b_conv, b_routes, b_fac, b_rel, b_cell, b_heat, b_tuiles, b_etat(G1_TAILLE_ETAT), b_strates, b_decrets;
bool pret() { return g_m != nullptr; }
std::string echapper(const std::string& s) { std::string r; for (char c : s) { if (c == '"' || c == '\\') r += '\\'; r += c; } return r; }
}

extern "C" {
void* g1_alloc(int n) { return std::malloc(size_t(std::max(1, n))); }
void g1_free(void* p) { std::free(p); }

int g1_load(const char* mat, const char* armes, const char* scen, const char* reg) {
  g_m.reset();
  if (!chargerDonnees(g_d, mat, armes, scen, reg, g_err)) return 0;
  g_m = std::make_unique<Monde>(g_d);
  g_warn = "["; for (size_t i = 0; i < g_d.avertissements.size(); ++i) g_warn += (i ? ",\"" : "\"") + echapper(g_d.avertissements[i]) + "\""; g_warn += "]";
  return 1;
}
const char* g1_error(void) { return g_err.c_str(); }
const char* g1_warnings(void) { return g_warn.c_str(); }
void g1_step(float dt) { if (pret()) g_m->avancer(dt); }
void g1_tick(void) { if (pret()) g_m->tick(); }
void g1_input(float avant, float cote, float lacet, float tangage, float cx, float cy, float cz, unsigned b) {
  if (!pret()) return; auto& e = g_m->entree;
  e.avant = std::clamp(avant, -1.f, 1.f); e.cote = std::clamp(cote, -1.f, 1.f); e.lacetCam = lacet; e.tangageCam = std::clamp(tangage, -1.4f, 1.4f);
  e.camX = cx + g_m->origineX; e.camY = cy; e.camZ = cz + g_m->origineZ;
  e.sprint = b & 1; e.accroupi = b & 2; e.tir = b & 4; e.visee = b & 8; e.recharger = b & 16;
}
void g1_mode(int m) { if (pret()) g_m->definirEchelle(Mode(std::clamp(m, 0, 2))); }
int g1_decret(int f, int d, int a) { return pret() && g_m->decreter(f, d, a != 0); }
void g1_budget(int f, int p, float v) { if (pret()) g_m->definirBudget(f, p, v); }
int g1_terraformer(int o, float x, float z, float r, float f, int dev) { return pret() && g_m->terraformer(o, x + g_m->origineX, z + g_m->origineZ, r, f, dev != 0); }
void g1_reponse_diplomatique(int a, int b, int accord, const char* t) { if (pret()) g_m->reponseDiplomatique(a, b, accord, t ? t : ""); }
int g1_heightmap16(const void* px, int n, float a, float b) { return pret() && g_m->chargerHeightmap16(static_cast<const uint16_t*>(px), n, a, b); }

int g1_terrain_n(void) { return pret() ? g_m->n : 0; }
float g1_terrain_cellule(void) { return pret() ? float(g_m->cell) : 0; }
float g1_terrain_taille(void) { return pret() ? float(g_m->taille) : 0; }
int g1_terrain_revision(void) { return pret() ? g_m->revisionTerrain : 0; }
const float* g1_terrain_hauteurs(void) { return pret() ? g_m->h.data() : nullptr; }
const float* g1_cellules(void) {
  if (!pret()) return nullptr; b_cell.resize(g_m->cellules.size() * 4);
  for (size_t i = 0; i < g_m->cellules.size(); ++i) { const Cellule& c = g_m->cellules[i]; float* o = &b_cell[i * 4]; o[0] = float(c.biome); o[1] = float(c.zone); o[2] = c.proprio; o[3] = c.ressource; }
  return b_cell.data();
}
const float* g1_heatmap(int t) {
  if (!pret()) return nullptr; const auto& C = g_m->cellules; b_heat.resize(C.size()); float mx = 1e-6f;
  for (size_t i = 0; i < C.size(); ++i) {
    const Cellule& c = C[i]; float v = 0;
    switch (t) { case HPib: v = c.pib; break; case HChomage: v = c.chomage; break; case HPollution: v = c.pollution; break; case HDensite: v = c.densite; break;
      case HRessource: v = c.ressource; break; case HControle: v = c.proprio == g_m->D.scenario.factionJoueur ? 1.f : c.proprio < 0 ? 0.5f : 0.f; break;
      case HIncertitude: v = std::min(1.f, g_m->connaissance[i] / 24.f); break; default: break; }
    b_heat[i] = v; if (t != HControle && t != HIncertitude && t != HChomage) mx = std::max(mx, v);
  }
  if (t != HControle && t != HIncertitude && t != HChomage) for (auto& v : b_heat) v /= mx;
  return b_heat.data();
}

int g1_structures_count(void) { return pret() ? int(g_m->structures.size()) : 0; }
const float* g1_structures(void) {
  if (!pret()) return nullptr; const auto& S = g_m->structures; b_struct.resize(S.size() * G1_STRIDE_STRUCTURE);
  for (size_t i = 0; i < S.size(); ++i) {
    const Structure& s = S[i]; float* o = &b_struct[i * G1_STRIDE_STRUCTURE];
    o[0] = float(s.c.x - g_m->origineX); o[1] = float(s.y); o[2] = float(s.c.z - g_m->origineZ); o[3] = s.c.l; o[4] = s.c.h; o[5] = s.c.p; o[6] = s.c.lacet;
    o[7] = s.etat; o[8] = float(s.c.role); o[9] = s.pvMax > 0 ? s.pv / s.pvMax : 0; o[10] = float(s.c.faction); o[11] = float(s.c.materiau);
  }
  return b_struct.data();
}
int g1_unites_count(void) { return pret() ? int(g_m->unites.size()) : 0; }
const float* g1_unites(void) {
  if (!pret()) return nullptr; const auto& U = g_m->unites; b_unites.resize(U.size() * G1_STRIDE_UNITE);
  for (size_t i = 0; i < U.size(); ++i) {
    const Unite& u = U[i]; float* o = &b_unites[i * G1_STRIDE_UNITE];
    o[0] = float(u.x - g_m->origineX); o[1] = float(u.y); o[2] = float(u.z - g_m->origineZ); o[3] = u.lacet; o[4] = u.tangage; o[5] = std::sqrt(u.vx * u.vx + u.vz * u.vz);
    o[6] = u.pv; o[7] = float(u.faction); o[8] = float(u.etat); o[9] = float(u.arme); o[10] = float(u.munitions); o[11] = u.jambe; o[12] = u.bras; o[13] = u.humain; o[14] = u.couvert; o[15] = float(u.id);
  }
  return b_unites.data();
}
int g1_projectiles_count(void) { if (!pret()) return 0; int k = 0; for (auto& p : g_m->projectiles) k += p.actif; return k; }
const float* g1_projectiles(void) {
  if (!pret()) return nullptr; b_proj.clear();
  for (auto& p : g_m->projectiles) if (p.actif) { float o[7] = {float(p.x - g_m->origineX), float(p.y), float(p.z - g_m->origineZ), float(p.vx), float(p.vy), float(p.vz), float(g_m->D.armes[size_t(p.arme) % g_m->D.armes.size()].explosif)}; b_proj.insert(b_proj.end(), o, o + 7); }
  return b_proj.data();
}
int g1_convois_count(void) { return pret() ? int(g_m->convois.size()) : 0; }
const float* g1_convois(void) {
  if (!pret()) return nullptr; b_conv.clear();
  for (auto& c : g_m->convois) { float o[8] = {float(c.x - g_m->origineX), float(g_m->hauteur(c.x, c.z)), float(c.z - g_m->origineZ), c.lacet, float(c.faction), float(c.bien), c.quantite, float(c.etat)}; b_conv.insert(b_conv.end(), o, o + 8); }
  return b_conv.data();
}
int g1_routes_count(void) { return pret() ? int(g_m->aretes.size()) : 0; }
const float* g1_routes(void) {
  if (!pret()) return nullptr; b_routes.clear();
  for (auto& e : g_m->aretes) { const Noeud &a = g_m->noeuds[e.a], &b = g_m->noeuds[e.b]; float o[5] = {float(a.x - g_m->origineX), float(a.z - g_m->origineZ), float(b.x - g_m->origineX), float(b.z - g_m->origineZ), float(e.coupee)}; b_routes.insert(b_routes.end(), o, o + 5); }
  return b_routes.data();
}
int g1_factions_count(void) { return pret() ? int(g_m->factions.size()) : 0; }
const float* g1_factions(void) {
  if (!pret()) return nullptr; const auto& F = g_m->factions; b_fac.assign(F.size() * G1_STRIDE_FACTION, 0.f);
  for (size_t i = 0; i < F.size(); ++i) {
    const Faction& f = F[i]; float* o = &b_fac[i * G1_STRIDE_FACTION];
    float v[G1_STRIDE_FACTION] = {float(f.tresor), float(f.dette), float(f.masse), f.inflation, f.taux, f.prixIndice, f.moral, f.stabilite, f.risque, float(f.pib), float(f.recettes), float(f.depenses),
                                  f.sanctions, float(f.fmi), float(f.unitesVivantes), f.effectifs, f.stock[0], f.stock[1], f.stock[2], f.stock[3], f.stock[4], f.stock[5], float(f.c.couleur), float(f.nbStructures)};
    std::memcpy(o, v, sizeof v);
  }
  return b_fac.data();
}
const char* g1_faction_nom(int i) { return pret() && i >= 0 && i < int(g_m->factions.size()) ? g_m->factions[i].c.nom.c_str() : ""; }
const char* g1_faction_id(int i) { return pret() && i >= 0 && i < int(g_m->factions.size()) ? g_m->factions[i].c.id.c_str() : ""; }
const float* g1_relations(void) {
  if (!pret()) return nullptr; size_t N = g_m->factions.size(); b_rel.resize(N * N * 2);
  for (size_t i = 0; i < N * N; ++i) { b_rel[i] = g_m->relations[i]; b_rel[N * N + i] = g_m->guerre[i]; }
  return b_rel.data();
}
const float* g1_strates(int f) {
  if (!pret() || f < 0 || f >= int(g_m->factions.size())) return nullptr; b_strates.resize(36);
  for (int c = 0; c < 3; ++c) for (int o = 0; o < 4; ++o) { const Groupe& g = g_m->factions[f].strates[c][o]; float* p = &b_strates[(c * 4 + o) * 3]; p[0] = g.pop; p[1] = g.satisfaction; p[2] = g.radicalisation; }
  return b_strates.data();
}
const float* g1_decrets(int f) {
  if (!pret() || f < 0 || f >= int(g_m->factions.size())) return nullptr; b_decrets.resize(NB_DECRETS + NB_POSTES);
  for (int d = 0; d < NB_DECRETS; ++d) b_decrets[d] = g_m->factions[f].decrets[d];
  for (int p = 0; p < NB_POSTES; ++p) b_decrets[NB_DECRETS + p] = g_m->factions[f].c.budget[p];
  return b_decrets.data();
}
int g1_tuiles_count(void) { return pret() ? int(g_m->tuilesActives.size()) : 0; }
const float* g1_tuiles(void) {
  if (!pret()) return nullptr; b_tuiles.clear(); int nt = int(std::ceil(g_m->taille / TUILE));
  for (int t : g_m->tuilesActives) { b_tuiles.push_back(float(-g_m->taille * 0.5 + (t % nt + 0.5) * TUILE - g_m->origineX)); b_tuiles.push_back(float(-g_m->taille * 0.5 + (t / nt + 0.5) * TUILE - g_m->origineZ)); }
  return b_tuiles.data();
}
const float* g1_etat(void) {
  if (!pret()) return nullptr; const Monde& m = *g_m; const Unite& u = m.unites[m.joueur]; float* o = b_etat.data();
  o[0] = float(m.heure); o[1] = float(m.temps); o[2] = float(int(m.mode)); o[3] = float(m.echelle); o[4] = float(m.acte); o[5] = float(int(m.statut)); o[6] = m.suspicion; o[7] = float(m.joueur);
  o[8] = float(m.origineX); o[9] = float(m.origineZ); o[10] = float(u.munitions); o[11] = float(u.reserve); o[12] = u.recharge; o[13] = u.enraye; o[14] = u.pv; o[15] = u.usure;
  o[16] = float(m.D.scenario.factionJoueur); o[17] = float(m.tuilesActives.size());
  for (int b = 0; b < NB_BIENS; ++b) { o[18 + b] = m.prix[b]; o[24 + b] = m.prixNoir[b]; }
  o[30] = float(m.ticks & 0xffffff); o[31] = float(m.revisionTerrain);
  return o;
}
const char* g1_events(void) { if (!pret()) return "[]"; g_ev = g_m->evenements(); return g_ev.c_str(); }
unsigned g1_hash(void) {   // FNV-1a sur les grandeurs principales (arrondies au mm / centime pour rester portable)
  if (!pret()) return 0; uint32_t h = 2166136261u; auto mix = [&](int64_t v) { for (int k = 0; k < 8; ++k) { h ^= uint8_t(v >> (8 * k)); h *= 16777619u; } };
  for (auto& u : g_m->unites) { mix(std::llround(u.x * 1000)); mix(std::llround(u.z * 1000)); mix(std::llround(u.pv * 100)); mix(int(u.etat)); }
  for (auto& f : g_m->factions) { mix(std::llround(f.tresor)); mix(std::llround(f.stabilite * 1e4)); }
  for (auto& s : g_m->structures) mix(std::llround(s.pv * 10));
  mix(int64_t(g_m->ticks)); return h;
}
}  // extern "C"
