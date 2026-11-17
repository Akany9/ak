// Rendu bgfx du monde simulé : LECTURE SEULE des tableaux exportés par le cœur (g1/api.h).
// Pipeline (document d'architecture r88, § 4) :
//   vue 0 (cible hors écran RGBA8 + D24S8) : terrain par chunks, bâtiments (SceneGraph + frustum culling), unités
//                                             (écriture stencil = 1), camions, lignes, eau ;
//   vue 1 (même cible) : contour d'escouade à travers les murs (profondeur GREATER, stencil ≠ 1, extrusion écran) ;
//   vue 2 (écran)      : post-traitement — copie, ou vision thermique FLIR (Ironbow, bruit capteur, vignettage).
#pragma once
#include <bgfx/bgfx.h>
#include <cstdint>
#include <vector>
#include "render/frustum_culling.hpp"
#include "scene/scene_graph.hpp"

struct Eclairage { float soleil[4], couleurSoleil[4], ciel[4], sol[4], brouillard[4], params[4]; };
struct OptionsRendu {
  float view[16], proj[16], eye[3]; int largeur = 1, hauteur = 1; float echelleUnites = 1, temps = 0;
  bool toutesTuiles = false, flir = false, contours = true;
};

class RenduMonde {
 public:
  void init();
  void shutdown();
  void majTerrain();                                        // chunks dont le relief a changé seulement (tampons dynamiques)
  void majTextures(int heatmap, bool incertitude);          // cartes de chaleur et brouillard d'information (≈ 4 Hz)
  void dessiner(const OptionsRendu& o, const Eclairage& E);
  float hauteur(float xLocal, float zLocal) const;          // même interpolation que Monde::hauteur (caméra)
  float joueur[4] = {0, 0, 0, 0};                           // position lissée du joueur (x, y, z, lacet)
  int batimentsVisibles = 0, batimentsCulles = 0, chunksVisibles = 0, chunksMisAJour = 0;
  static constexpr bgfx::ViewId VUE_SCENE = 0, VUE_CONTOUR = 1, VUE_POST = 2;
 private:
  struct Chunk { bgfx::DynamicVertexBufferHandle vb = BGFX_INVALID_HANDLE; uint32_t n = 0; int i0, j0, i1, j1; float cx, cz, rayon; };
  std::vector<Chunk> chunks_; std::vector<float> h_; std::vector<uint8_t> splat_; std::vector<float> inc_;
  int n_ = 0, revision_ = -1; float cell_ = 8, taille_ = 2048, eau_ = -1;
  bgfx::VertexLayout lTerrain_, lPos_, lPosNormale_, lCouleur_, lEcran_;
  bgfx::ProgramHandle pTerrain_ = BGFX_INVALID_HANDLE, pInstance_ = BGFX_INVALID_HANDLE, pCouleur_ = BGFX_INVALID_HANDLE, pContour_ = BGFX_INVALID_HANDLE,
                      pThermique_ = BGFX_INVALID_HANDLE, pCopie_ = BGFX_INVALID_HANDLE;
  bgfx::VertexBufferHandle vbBoite_ = BGFX_INVALID_HANDLE, vbSoldat_ = BGFX_INVALID_HANDLE;
  bgfx::TextureHandle tChaleur_ = BGFX_INVALID_HANDLE, tInc_ = BGFX_INVALID_HANDLE, tCouches_[4] = {}, tBruit_ = BGFX_INVALID_HANDLE;
  bgfx::FrameBufferHandle fb_ = BGFX_INVALID_HANDLE; bgfx::TextureHandle fbCouleur_ = BGFX_INVALID_HANDLE; int fbW_ = 0, fbH_ = 0;
  bgfx::UniformHandle uMonde_, uSoleil_, uCouleurSoleil_, uCiel_, uSol_, uBrouillard_, uOeil_, uParams_, uMode_, uContour_, uThermique_,
                      sChaleur_, sInc_, sCouches_[4], sGBuffer_, sBruit_;
  SceneGraph scene_; std::vector<Handle> noeudsBatiments_; FrustumCuller culler_;
  std::vector<float> lisse_;   // positions lissées des unités (20 Hz → affichage)
  void uniformes(const float eye[3], const Eclairage& E, float mode);
  void construireChunk(Chunk& c, bool creer);
  void cible(int w, int h);
};
