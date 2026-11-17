// Adaptateur Havok Physics (document d'architecture r88, § 8) — option R88_USE_HAVOK, cible native uniquement.
// SQUELETTE : le SDK Havok est propriétaire et absent de ce dépôt ; ce fichier n'a donc JAMAIS été compilé ici.
// Il reprend la structure du document (hkpSampledHeightFieldShape) derrière la même interface IPhysicsWorld, pour que
// l'intégration se limite à compléter ce fichier une fois le SDK disponible.
#if defined(R88_USE_HAVOK)
#include <Common/Base/hkBase.h>
#include <Physics2012/Collide/Shape/HeightField/SampledHeightField/hkpSampledHeightFieldShape.h>
#include <Physics2012/Dynamics/World/hkpWorld.h>
#include "g1/physique.hpp"

namespace g1 {
namespace {
class R88HavokHeightField : public hkpSampledHeightFieldShape {
 public:
  R88HavokHeightField(const hkpSampledHeightFieldBaseCinfo& ci, const float* data) : hkpSampledHeightFieldShape(ci), m_data(data) {}
  HK_FORCE_INLINE hkReal getHeightAtImpl(int x, int z) const { return hkReal(m_data[z * m_xRes + x]); }
  HK_FORCE_INLINE hkBool getTriangleFlipImpl() const { return false; }
  void collideSpheres(const CollideSpheresInput& input, SphereCollisionOutput* outputArray) const override { hkSampledHeightFieldShape_collideSpheres(*this, input, outputArray); }
 private:
  const float* m_data;
};

class HavokWorld final : public IPhysicsWorld {
 public:
  const char* nom() const override { return "havok"; }
  void init() override { /* hkMemoryInitUtil + hkBaseSystem::init + hkpWorld (voir la documentation du SDK) */ }
  void step(float dt) override { if (m_world) m_world->stepDeltaTime(dt); }
  void set_heightfield(const float* h, uint32_t w, uint32_t hg, float scale) override {
    m_heights.assign(h, h + size_t(w) * hg);
    hkpSampledHeightFieldBaseCinfo ci; ci.m_xRes = int(w); ci.m_zRes = int(hg); ci.m_scale.set(scale, 1, scale);
    m_shape = new R88HavokHeightField(ci, m_heights.data());   // à attacher à un hkpRigidBody statique du monde
  }
  void set_boites(const std::vector<Boite>&) override { /* hkpBoxShape statiques */ }
  void maj_boite(int, const Boite&) override {}
  bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float& d) override { int b; return raycast(ox, oy, oz, dx, dy, dz, 1e5f, d, b); }
  bool raycast(float, float, float, float, float, float, float, float&, int& boite) override { boite = -1; return false; /* hkpWorld::castRay */ }
 private:
  hkpWorld* m_world = nullptr; hkpSampledHeightFieldShape* m_shape = nullptr; std::vector<float> m_heights;
};
}  // namespace
std::unique_ptr<IPhysicsWorld> creerPhysiqueHavok() { return std::make_unique<HavokWorld>(); }
}  // namespace g1
#endif
