// Générateur pseudo-aléatoire déterministe (xoshiro128**) : même graine → même partie, en natif comme en WebAssembly.
// Aucune dépendance à <random> (dont les distributions diffèrent entre bibliothèques standard).
#pragma once
#include <cstdint>

namespace g1 {
struct Rng {
  uint32_t s[4];
  explicit Rng(uint64_t graine = 1) { semer(graine); }
  void semer(uint64_t g) {
    for (int i = 0; i < 4; ++i) { g += 0x9e3779b97f4a7c15ull; uint64_t z = g; z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ull;
      z = (z ^ (z >> 27)) * 0x94d049bb133111ebull; s[i] = uint32_t(z ^ (z >> 31)); }
  }
  static uint32_t rotl(uint32_t x, int k) { return (x << k) | (x >> (32 - k)); }
  uint32_t u32() { uint32_t r = rotl(s[1] * 5, 7) * 9, t = s[1] << 9; s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3]; s[2] ^= t; s[3] = rotl(s[3], 11); return r; }
  float unif() { return (u32() >> 8) * (1.0f / 16777216.0f); }                 // [0, 1)
  float sym() { return unif() * 2.f - 1.f; }                                     // [−1, 1)
  float gauss() { float a = 0; for (int i = 0; i < 4; ++i) a += unif(); return (a - 2.f) * 1.7320508f; }   // ≈ N(0, 1), borné
};
// bruit de valeur 2D déterministe (relief), sans état
inline float hash2(int x, int z, uint32_t graine) {
  uint32_t h = uint32_t(x) * 374761393u + uint32_t(z) * 668265263u + graine * 2246822519u; h = (h ^ (h >> 13)) * 1274126177u;
  return float((h ^ (h >> 16)) & 0xffffff) / 16777215.f;
}
inline float bruit(double x, double z, uint32_t graine) {
  int ix = (int)(x >= 0 ? x : x - 1), iz = (int)(z >= 0 ? z : z - 1); float fx = float(x - ix), fz = float(z - iz);
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  float a = hash2(ix, iz, graine), b = hash2(ix + 1, iz, graine), c = hash2(ix, iz + 1, graine), d = hash2(ix + 1, iz + 1, graine);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
}  // namespace g1
