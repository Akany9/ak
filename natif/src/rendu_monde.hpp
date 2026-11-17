// Rendu bgfx du monde simulé : LECTURE SEULE des tableaux exportés par le cœur (g1/api.h). Portage direct de
// web/src/rendu/{terrain,entites}.js : mêmes maillages (tuiles de 512 m, triangulation de Monde::hauteur), mêmes
// shaders (natif/shaders/*.sc ↔ GLSL de three.js), instanciation GPU pour bâtiments, soldats et camions.
#pragma once
#include <bgfx/bgfx.h>
#include <cstdint>
#include <vector>

struct Eclairage { float soleil[4], couleurSoleil[4], ciel[4], sol[4], brouillard[4], params[4]; };

class RenduMonde {
 public:
  void init();
  void shutdown();
  void majTerrain();                                        // à appeler quand g1_terrain_revision() change
  void majTextures(int heatmap, bool incertitude);          // cartes de chaleur et brouillard d'information (≈ 4 Hz)
  void dessiner(bgfx::ViewId vue, const float eye[3], const Eclairage& E, float echelleUnites, bool toutesTuiles);
  float hauteur(float xLocal, float zLocal) const;          // même interpolation que Monde::hauteur (caméra)
  float joueur[4] = {0, 0, 0, 0};                           // position lissée du joueur (x, y, z, lacet)
 private:
  struct Tuile { bgfx::VertexBufferHandle vb = BGFX_INVALID_HANDLE; uint32_t n = 0; float cx = 0, cz = 0; };
  std::vector<Tuile> tuiles_; std::vector<float> h_; int n_ = 0, revision_ = -1; float cell_ = 8, taille_ = 2048, eau_ = -1;
  bgfx::VertexLayout lTerrain_, lPos_, lCouleur_;
  bgfx::ProgramHandle pTerrain_ = BGFX_INVALID_HANDLE, pInstance_ = BGFX_INVALID_HANDLE, pCouleur_ = BGFX_INVALID_HANDLE;
  bgfx::VertexBufferHandle vbBoite_ = BGFX_INVALID_HANDLE, vbSoldat_ = BGFX_INVALID_HANDLE; bgfx::IndexBufferHandle ibBoite_ = BGFX_INVALID_HANDLE;
  uint32_t nSoldat_ = 0;
  bgfx::TextureHandle tChaleur_ = BGFX_INVALID_HANDLE, tInc_ = BGFX_INVALID_HANDLE;
  bgfx::UniformHandle uMonde_, uSoleil_, uCouleurSoleil_, uCiel_, uSol_, uBrouillard_, uOeil_, uParams_, uBiomes_, sChaleur_, sInc_;
  std::vector<float> lisse_;   // positions lissées des unités (20 Hz → affichage)
  void uniformes(const float eye[3], const Eclairage& E);
};
