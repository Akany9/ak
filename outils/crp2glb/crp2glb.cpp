// crp2glb — convertit un paquet d'asset Cities: Skylines (.crp, « Colossal Raw Package ») en glTF binaire (.glb).
//   crp2glb <entree.crp> <dossier_sortie>      → écrit <slug>.glb et une ligne JSON (manifeste) sur la sortie standard
//
// Format CRP (rétro-ingénierie, aucune documentation officielle) :
//   « CRAP », u16 version, chaînes .NET (longueur 7 bits) : paquet (n° Workshop), auteur, u32 version, asset principal,
//   i32 nombre d'entrées, i64 début des données ; par entrée : nom, somme de contrôle, i32 type, i64 décalage, i64 taille.
//   Objet : u8 nul, chaîne type .NET, chaîne nom, puis les champs sérialisés :
//     UnityEngine.Mesh      : sommets(xyz), couleurs(rgba), uv(xy), normales(xyz), tangentes(xyzw), poids d'os(32 o),
//                             bindposes(64 o), sous-maillages (i32 n, n × i32 indices) — chaque tableau préfixé de i32
//     UnityEngine.Texture2D : u8 linéaire, i32 anisotropie, i32 longueur, fichier DDS (DXT1 / DXT5 / non compressé)
//   Textures Cities: Skylines : _MainTex (diffuse), _XYSMap (normale XY + spéculaire), _ACIMap (alpha inversé, masque de
//   couleur, émission). Repère Unity main gauche (z vers l'avant) → glTF main droite : z → −z.
//
// Les assets restent la propriété de leurs auteurs (Steam Workshop) : cet outil convertit les fichiers de l'utilisateur
// en local ; ni les .crp ni les .glb produits ne sont versionnés (voir assets/LISEZMOI.md).
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "third_party/stb_image_write.h"

namespace {
struct Lecteur {
  const uint8_t* d; size_t n, p = 0; bool ok = true;
  bool reste(size_t k) { if (p + k > n) { ok = false; return false; } return true; }
  uint8_t u8() { return reste(1) ? d[p++] : 0; }
  template <class T> T lire() { T v{}; if (reste(sizeof(T))) { std::memcpy(&v, d + p, sizeof(T)); p += sizeof(T); } return v; }
  std::string chaine() {
    uint32_t len = 0; int dec = 0; uint8_t b;
    do { b = u8(); len |= uint32_t(b & 0x7f) << dec; dec += 7; } while ((b & 0x80) && ok && dec < 35);
    if (!reste(len)) return {}; std::string s(reinterpret_cast<const char*>(d + p), len); p += len; return s;
  }
};
struct Entree { std::string nom, controle; int type; int64_t decalage, taille; };
struct Maillage { std::string nom; std::vector<float> pos, uv, nor, tan; std::vector<std::vector<uint32_t>> sous; };
struct Texture { std::string nom; bool lineaire; int w = 0, h = 0; std::vector<uint8_t> rgba; };

// ---------------------------------------------------------------------------------------------- DDS (DXT1, DXT3, DXT5, RGBA)
void couleur565(uint16_t c, uint8_t* o) { o[0] = uint8_t(((c >> 11) & 31) * 255 / 31); o[1] = uint8_t(((c >> 5) & 63) * 255 / 63); o[2] = uint8_t((c & 31) * 255 / 31); }
void blocCouleur(const uint8_t* b, uint8_t* sortie, int pitch, bool dxt1) {
  uint16_t c0 = uint16_t(b[0] | b[1] << 8), c1 = uint16_t(b[2] | b[3] << 8); uint8_t p[4][4] = {};
  couleur565(c0, p[0]); couleur565(c1, p[1]); p[0][3] = p[1][3] = 255;
  for (int k = 0; k < 3; ++k) {
    if (!dxt1 || c0 > c1) { p[2][k] = uint8_t((2 * p[0][k] + p[1][k]) / 3); p[3][k] = uint8_t((p[0][k] + 2 * p[1][k]) / 3); }
    else { p[2][k] = uint8_t((p[0][k] + p[1][k]) / 2); p[3][k] = 0; }
  }
  p[2][3] = 255; p[3][3] = (dxt1 && c0 <= c1) ? 0 : 255;
  uint32_t idx = uint32_t(b[4] | b[5] << 8 | b[6] << 16 | uint32_t(b[7]) << 24);
  for (int i = 0; i < 16; ++i) std::memcpy(sortie + (i / 4) * pitch + (i % 4) * 4, p[(idx >> (2 * i)) & 3], 4);
}
void blocAlphaDXT5(const uint8_t* b, uint8_t* sortie, int pitch) {
  uint8_t a[8] = {b[0], b[1]};
  if (a[0] > a[1]) for (int i = 1; i < 7; ++i) a[i + 1] = uint8_t(((7 - i) * a[0] + i * a[1]) / 7);
  else { for (int i = 1; i < 5; ++i) a[i + 1] = uint8_t(((5 - i) * a[0] + i * a[1]) / 5); a[6] = 0; a[7] = 255; }
  uint64_t bits = 0; for (int i = 0; i < 6; ++i) bits |= uint64_t(b[2 + i]) << (8 * i);
  for (int i = 0; i < 16; ++i) sortie[(i / 4) * pitch + (i % 4) * 4 + 3] = a[(bits >> (3 * i)) & 7];
}
bool decoderDDS(const uint8_t* d, size_t n, Texture& t) {
  if (n < 128 || std::memcmp(d, "DDS ", 4) != 0) return false;
  auto u32 = [&](size_t o) { uint32_t v; std::memcpy(&v, d + o, 4); return v; };
  t.h = int(u32(12)); t.w = int(u32(16)); uint32_t flags = u32(80); char cc[5] = {}; std::memcpy(cc, d + 84, 4); uint32_t bits = u32(88);
  if (t.w <= 0 || t.h <= 0 || t.w > 8192 || t.h > 8192) return false;
  const uint8_t* s = d + 128; size_t reste = n - 128; t.rgba.assign(size_t(t.w) * t.h * 4, 255);
  const int bw = (t.w + 3) / 4, bh = (t.h + 3) / 4; std::vector<uint8_t> bloc(16 * 4);
  if (flags & 4) {   // compressé
    const bool dxt1 = !std::strcmp(cc, "DXT1"), dxt5 = !std::strcmp(cc, "DXT5"), dxt3 = !std::strcmp(cc, "DXT3");
    if (!dxt1 && !dxt5 && !dxt3) return false;
    const size_t taille = dxt1 ? 8 : 16; if (reste < size_t(bw) * bh * taille) return false;
    for (int by = 0; by < bh; ++by)
      for (int bx = 0; bx < bw; ++bx) {
        const uint8_t* b = s + (size_t(by) * bw + bx) * taille;
        blocCouleur(dxt1 ? b : b + 8, bloc.data(), 16, dxt1);
        if (dxt5) blocAlphaDXT5(b, bloc.data(), 16);
        if (dxt3) for (int i = 0; i < 16; ++i) bloc[(i / 4) * 16 + (i % 4) * 4 + 3] = uint8_t(((b[i / 2] >> ((i & 1) * 4)) & 15) * 17);
        for (int y = 0; y < 4; ++y) for (int x = 0; x < 4; ++x) {
          int px = bx * 4 + x, py = by * 4 + y; if (px < t.w && py < t.h) std::memcpy(&t.rgba[(size_t(py) * t.w + px) * 4], &bloc[y * 16 + x * 4], 4);
        }
      }
    return true;
  }
  if ((flags & 0x40) && (bits == 32 || bits == 24)) {   // non compressé (masques BGRA habituels de Unity)
    const int o = int(bits / 8); if (reste < size_t(t.w) * t.h * o) return false;
    uint32_t mr = u32(92), mg = u32(96), mb = u32(100), ma = u32(104);
    auto canal = [](uint32_t v, uint32_t m) -> uint8_t { if (!m) return 255; int sh = 0; while (!((m >> sh) & 1)) ++sh; return uint8_t(((v & m) >> sh) * 255 / (m >> sh)); };
    for (size_t i = 0; i < size_t(t.w) * t.h; ++i) {
      uint32_t v = 0; std::memcpy(&v, s + i * o, size_t(o));
      t.rgba[i * 4] = canal(v, mr); t.rgba[i * 4 + 1] = canal(v, mg); t.rgba[i * 4 + 2] = canal(v, mb); t.rgba[i * 4 + 3] = ma ? canal(v, ma) : 255;
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------- lecture du paquet
bool lireMaillage(Lecteur& r, Maillage& m) {
  auto tableau = [&](int composantes, std::vector<float>* sortie, size_t octets) {
    int32_t k = r.lire<int32_t>(); if (k < 0 || !r.reste(size_t(k) * octets)) { r.ok = false; return 0; }
    if (sortie) { sortie->resize(size_t(k) * composantes); std::memcpy(sortie->data(), r.d + r.p, size_t(k) * octets); }
    r.p += size_t(k) * octets; return k;
  };
  int nv = tableau(3, &m.pos, 12); tableau(4, nullptr, 16); tableau(2, &m.uv, 8); tableau(3, &m.nor, 12); tableau(4, &m.tan, 16);
  tableau(0, nullptr, 32); tableau(0, nullptr, 64);
  int32_t ns = r.lire<int32_t>(); if (ns < 0 || ns > 64) return false;
  for (int s = 0; s < ns && r.ok; ++s) {
    int32_t c = r.lire<int32_t>(); if (c < 0 || !r.reste(size_t(c) * 4)) return false;
    std::vector<uint32_t> idx(static_cast<size_t>(c)); std::memcpy(idx.data(), r.d + r.p, size_t(c) * 4); r.p += size_t(c) * 4;
    for (auto i : idx) if (i >= uint32_t(nv)) return false;
    m.sous.push_back(std::move(idx));
  }
  return r.ok && nv > 0 && !m.sous.empty();
}

std::string slug(const std::string& s) {
  std::string r; for (unsigned char c : s) r += (std::isalnum(c) ? char(std::tolower(c)) : '_');
  while (r.find("__") != std::string::npos) r.replace(r.find("__"), 2, "_");
  while (!r.empty() && r.back() == '_') r.pop_back(); return r.empty() ? "asset" : r;
}
std::string echapper(const std::string& s) { std::string r; for (char c : s) { if (c == '"' || c == '\\') r += '\\'; if (uint8_t(c) >= 32) r += c; } return r; }

// ---------------------------------------------------------------------------------------------- écriture glTF binaire
struct Glb {
  std::vector<uint8_t> bin; std::ostringstream vues, acces; int nVues = 0, nAcces = 0;
  int vue(const void* p, size_t n, int cible) {
    while (bin.size() % 4) bin.push_back(0); size_t o = bin.size(); bin.insert(bin.end(), (const uint8_t*)p, (const uint8_t*)p + n);
    vues << (nVues ? "," : "") << "{\"buffer\":0,\"byteOffset\":" << o << ",\"byteLength\":" << n << (cible ? ",\"target\":" + std::to_string(cible) : "") << "}";
    return nVues++;
  }
  int accesseur(int v, int type, size_t compte, const char* forme, const std::string& extra = "") {
    acces << (nAcces ? "," : "") << "{\"bufferView\":" << v << ",\"componentType\":" << type << ",\"count\":" << compte << ",\"type\":\"" << forme << "\"" << extra << "}";
    return nAcces++;
  }
};
void pngVers(void* ctx, void* data, int n) { auto* v = static_cast<std::vector<uint8_t>*>(ctx); v->insert(v->end(), (uint8_t*)data, (uint8_t*)data + n); }
}  // namespace

int main(int argc, char** argv) {
  if (argc < 3) { std::fprintf(stderr, "usage : crp2glb <entree.crp> <dossier_sortie>\n"); return 2; }
  std::ifstream f(argv[1], std::ios::binary); std::vector<uint8_t> d((std::istreambuf_iterator<char>(f)), {});
  Lecteur r{d.data(), d.size()};
  if (d.size() < 16 || std::memcmp(d.data(), "CRAP", 4) != 0) { std::fprintf(stderr, "%s : pas un paquet CRP\n", argv[1]); return 1; }
  r.p = 4; r.lire<uint16_t>(); std::string paquet = r.chaine(); r.chaine(); r.lire<uint32_t>(); std::string principal = r.chaine();
  int32_t ne = r.lire<int32_t>(); int64_t debut = r.lire<int64_t>(); if (ne < 0 || ne > 100000 || !r.ok) return 1;
  std::vector<Entree> E; for (int i = 0; i < ne && r.ok; ++i) { Entree e; e.nom = r.chaine(); e.controle = r.chaine(); e.type = r.lire<int32_t>(); e.decalage = r.lire<int64_t>(); e.taille = r.lire<int64_t>(); E.push_back(e); }

  // catégorie : composant d'information de Cities: Skylines présent dans le paquet
  std::string tout(d.begin(), d.end()), categorie = "autre";
  if (tout.find("BuildingInfoGen,") != std::string::npos || tout.find("BuildingInfo,") != std::string::npos) categorie = "batiment";
  else if (tout.find("VehicleInfoGen,") != std::string::npos || tout.find("VehicleInfo,") != std::string::npos) categorie = "vehicule";
  else if (tout.find("TreeInfo,") != std::string::npos || tout.find("TreeInfoGen,") != std::string::npos) categorie = "arbre";
  else if (tout.find("PropInfoGen,") != std::string::npos || tout.find("PropInfo,") != std::string::npos) categorie = "prop";
  else if (tout.find("NetInfo,") != std::string::npos) categorie = "route";

  Maillage principalM; bool trouve = false; std::map<std::string, Texture> tex; int nMaillages = 0;
  for (auto& e : E) {
    if (e.decalage < 0 || e.taille <= 0 || debut + e.decalage + e.taille > int64_t(d.size())) continue;
    Lecteur o{d.data() + debut + e.decalage, size_t(e.taille)}; o.u8(); std::string type = o.chaine(), nom = o.chaine();
    if (type.rfind("UnityEngine.Mesh,", 0) == 0) {
      ++nMaillages; Maillage m; m.nom = nom;
      if (!trouve && lireMaillage(o, m)) { principalM = std::move(m); trouve = true; }   // 1er maillage = modèle principal (les suivants : LOD, sous-bâtiments)
    } else if (type.rfind("UnityEngine.Texture2D,", 0) == 0 && (nom == "_MainTex" || nom == "_XYSMap" || nom == "_ACIMap") && !tex.count(nom)) {
      Texture t; t.nom = nom; t.lineaire = o.u8(); o.lire<int32_t>(); int32_t len = o.lire<int32_t>();
      if (len > 0 && o.reste(size_t(len)) && decoderDDS(o.d + o.p, size_t(len), t)) tex[nom] = std::move(t);
    }
  }
  if (!trouve) { std::fprintf(stderr, "%s : aucun maillage (catégorie %s)\n", argv[1], categorie.c_str()); return 3; }

  // ---- géométrie : main gauche (Unity) → main droite (glTF) par z → −z ; l'ordre des indices reste valable
  Maillage& m = principalM; const size_t nv = m.pos.size() / 3;
  float mn[3] = {1e30f, 1e30f, 1e30f}, mx[3] = {-1e30f, -1e30f, -1e30f};
  for (size_t i = 0; i < nv; ++i) { m.pos[i * 3 + 2] = -m.pos[i * 3 + 2]; for (int k = 0; k < 3; ++k) { mn[k] = std::min(mn[k], m.pos[i * 3 + k]); mx[k] = std::max(mx[k], m.pos[i * 3 + k]); } }
  if (m.nor.size() == nv * 3) for (size_t i = 0; i < nv; ++i) m.nor[i * 3 + 2] = -m.nor[i * 3 + 2]; else m.nor.clear();
  if (m.tan.size() == nv * 4) for (size_t i = 0; i < nv; ++i) { m.tan[i * 4 + 2] = -m.tan[i * 4 + 2]; m.tan[i * 4 + 3] = -m.tan[i * 4 + 3]; } else m.tan.clear();
  if (m.uv.size() != nv * 2) m.uv.clear();
  // les lignes du DDS sont dans l'ordre de Unity (bas en premier) : écrites telles quelles en PNG (haut en premier), les
  // coordonnées v de Unity restent donc valables pour glTF sans inversion

  Glb g; size_t triangles = 0;
  int aPos = g.accesseur(g.vue(m.pos.data(), m.pos.size() * 4, 34962), 5126, nv, "VEC3",
                         ",\"min\":[" + std::to_string(mn[0]) + "," + std::to_string(mn[1]) + "," + std::to_string(mn[2]) + "],\"max\":[" + std::to_string(mx[0]) + "," + std::to_string(mx[1]) + "," + std::to_string(mx[2]) + "]");
  std::string attributs = "\"POSITION\":" + std::to_string(aPos);
  if (!m.nor.empty()) attributs += ",\"NORMAL\":" + std::to_string(g.accesseur(g.vue(m.nor.data(), m.nor.size() * 4, 34962), 5126, nv, "VEC3"));
  if (!m.uv.empty()) attributs += ",\"TEXCOORD_0\":" + std::to_string(g.accesseur(g.vue(m.uv.data(), m.uv.size() * 4, 34962), 5126, nv, "VEC2"));
  if (!m.tan.empty() && tex.count("_XYSMap")) attributs += ",\"TANGENT\":" + std::to_string(g.accesseur(g.vue(m.tan.data(), m.tan.size() * 4, 34962), 5126, nv, "VEC4"));
  std::ostringstream prims;
  for (size_t s = 0; s < m.sous.size(); ++s) {
    if (m.sous[s].empty()) continue; triangles += m.sous[s].size() / 3;
    int a = g.accesseur(g.vue(m.sous[s].data(), m.sous[s].size() * 4, 34963), 5125, m.sous[s].size(), "SCALAR");
    prims << (prims.tellp() > 0 ? "," : "") << "{\"attributes\":{" << attributs << "},\"indices\":" << a << ",\"material\":0}";
  }
  // ---- textures : couleur de base (+ alpha de l'ACI, inversé), carte normale reconstruite depuis XYS
  std::ostringstream images, textures; int nImg = 0; std::string matTex, matNorm, alphaMode = "OPAQUE";
  auto ajouterImage = [&](const Texture& t) {
    std::vector<uint8_t> png; stbi_write_png_to_func(pngVers, &png, t.w, t.h, 4, t.rgba.data(), t.w * 4);
    int v = g.vue(png.data(), png.size(), 0);
    images << (nImg ? "," : "") << "{\"bufferView\":" << v << ",\"mimeType\":\"image/png\"}";
    textures << (nImg ? "," : "") << "{\"source\":" << nImg << ",\"sampler\":0}"; return nImg++;
  };
  if (tex.count("_MainTex")) {
    Texture c = tex["_MainTex"]; bool transparent = false;
    if (tex.count("_ACIMap") && tex["_ACIMap"].w == c.w && tex["_ACIMap"].h == c.h) {
      const auto& a = tex["_ACIMap"].rgba; for (size_t i = 0; i < size_t(c.w) * c.h; ++i) { c.rgba[i * 4 + 3] = uint8_t(255 - a[i * 4]); transparent |= a[i * 4] > 127; }
    } else for (size_t i = 0; i < size_t(c.w) * c.h; ++i) c.rgba[i * 4 + 3] = 255;
    if (transparent) alphaMode = "MASK";
    matTex = ",\"baseColorTexture\":{\"index\":" + std::to_string(ajouterImage(c)) + "}";
  }
  if (tex.count("_XYSMap") && !m.tan.empty()) {
    Texture n = tex["_XYSMap"];
    for (size_t i = 0; i < size_t(n.w) * n.h; ++i) {
      float x = n.rgba[i * 4] / 127.5f - 1, y = n.rgba[i * 4 + 1] / 127.5f - 1, z = std::sqrt(std::max(0.f, 1 - x * x - y * y));
      n.rgba[i * 4 + 2] = uint8_t((z * 0.5f + 0.5f) * 255); n.rgba[i * 4 + 3] = 255;
    }
    matNorm = ",\"normalTexture\":{\"index\":" + std::to_string(ajouterImage(n)) + "}";
  }
  while (g.bin.size() % 4) g.bin.push_back(0);
  std::ostringstream j;
  j << "{\"asset\":{\"version\":\"2.0\",\"generator\":\"Game 1 crp2glb\"},\"scene\":0,\"scenes\":[{\"nodes\":[0]}],\"nodes\":[{\"mesh\":0,\"name\":\"" << echapper(principal) << "\"}],"
    << "\"meshes\":[{\"name\":\"" << echapper(m.nom) << "\",\"primitives\":[" << prims.str() << "]}],"
    << "\"materials\":[{\"name\":\"" << echapper(principal) << "\",\"alphaMode\":\"" << alphaMode << "\"" << (alphaMode == "MASK" ? ",\"alphaCutoff\":0.5" : "")
    << ",\"doubleSided\":" << (categorie == "arbre" || alphaMode == "MASK" ? "true" : "false")
    << ",\"pbrMetallicRoughness\":{\"metallicFactor\":0,\"roughnessFactor\":0.85" << matTex << "}" << matNorm << "}],"
    << (nImg ? "\"samplers\":[{\"magFilter\":9729,\"minFilter\":9987,\"wrapS\":10497,\"wrapT\":10497}],\"images\":[" + images.str() + "],\"textures\":[" + textures.str() + "]," : "")
    << "\"accessors\":[" << g.acces.str() << "],\"bufferViews\":[" << g.vues.str() << "],\"buffers\":[{\"byteLength\":" << g.bin.size() << "}]}";
  std::string json = j.str(); while (json.size() % 4) json += ' ';
  std::string nomFichier = slug(principal) + ".glb", chemin = std::string(argv[2]) + "/" + nomFichier;
  FILE* o = std::fopen(chemin.c_str(), "wb"); if (!o) { std::fprintf(stderr, "écriture impossible : %s\n", chemin.c_str()); return 1; }
  auto u32 = [&](uint32_t v) { std::fwrite(&v, 4, 1, o); };
  u32(0x46546C67); u32(2); u32(uint32_t(12 + 8 + json.size() + 8 + g.bin.size()));
  u32(uint32_t(json.size())); u32(0x4E4F534A); std::fwrite(json.data(), 1, json.size(), o);
  u32(uint32_t(g.bin.size())); u32(0x004E4942); std::fwrite(g.bin.data(), 1, g.bin.size(), o); std::fclose(o);
  std::printf("{\"nom\":\"%s\",\"fichier\":\"%s\",\"categorie\":\"%s\",\"workshop\":\"%s\",\"taille\":[%.2f,%.2f,%.2f],\"centre\":[%.2f,%.2f,%.2f],\"sol\":%.2f,\"triangles\":%zu,\"textures\":%d,\"maillages\":%d}\n",
              echapper(principal).c_str(), nomFichier.c_str(), categorie.c_str(), echapper(paquet).c_str(), mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2],
              (mx[0] + mn[0]) / 2, (mx[1] + mn[1]) / 2, (mx[2] + mn[2]) / 2, mn[1], triangles, nImg, nMaillages);
  return 0;
}
