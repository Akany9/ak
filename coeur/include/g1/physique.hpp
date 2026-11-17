// Isolation de la physique (document d'architecture r88, § 8 : « Patron d'isolation, Adapter Pattern »).
// Le cœur ne parle qu'à IPhysicsWorld ; trois adaptateurs :
//   - PhysiqueR88 (défaut) : heightfield + boîtes orientées, écrit avec les seules opérations IEEE déterministes ;
//     identique au bit près en natif et en WebAssembly (c'est lui qui garantit l'empreinte commune).
//   - JoltWorld (option G1_JOLT, natif) : Jolt Physics (MIT), HeightFieldShape + BoxShape, requêtes NarrowPhase.
//   - HavokWorld (option R88_USE_HAVOK) : hkpSampledHeightFieldShape ; nécessite le SDK Havok (propriétaire).
// Choix par les données : "physique" dans data/reglages.json ("r88", "jolt", "havok") ; repli sur r88 si absent.
#pragma once
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace g1 {
struct Boite { float cx = 0, cy = 0, cz = 0, hx = 0.5f, hy = 0.5f, hz = 0.5f, lacet = 0; bool active = true; };   // centre, demi-tailles, lacet (rad)

class IPhysicsWorld {
 public:
  virtual ~IPhysicsWorld() = default;
  virtual const char* nom() const = 0;
  virtual void init() = 0;
  virtual void step(float delta_time) = 0;
  // heightfield : largeur × hauteur sommets, pas `scale` (m), coin (−largeur·scale/2, −hauteur·scale/2) — repère du monde
  virtual void set_heightfield(const float* heights, uint32_t width, uint32_t height, float scale) = 0;
  virtual void set_boites(const std::vector<Boite>& boites) = 0;         // obstacles statiques (bâtiments, ponts), id = index
  virtual void maj_boite(int id, const Boite& b) = 0;                    // ex. bâtiment fracturé → gravats
  // signature du document : distance au premier obstacle (terrain ou boîte) le long d'un rayon normalisé
  virtual bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float& hit_dist) = 0;
  // variante du cœur : distance maximale et identifiant de la boîte touchée (−1 : terrain)
  virtual bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float maxDist, float& hit_dist, int& boite) = 0;
};

std::unique_ptr<IPhysicsWorld> creerPhysique(const std::string& nom, std::string& avertissement);
}  // namespace g1
