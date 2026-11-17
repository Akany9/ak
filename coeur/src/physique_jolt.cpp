// Adaptateur Jolt Physics (MIT) — option G1_JOLT (CMake). Heightfield + boîtes statiques, requêtes de rayon par la
// NarrowPhaseQuery. Compilé avec CROSS_PLATFORM_DETERMINISTIC. La triangulation du heightfield de Jolt (diagonale
// (x, y) → (x+1, y+1)) est celle de Monde::hauteur : sol simulé, sol affiché et sol physique coïncident.
#if defined(G1_JOLT)
#include <Jolt/Jolt.h>
#include <Jolt/Core/Factory.h>
#include <Jolt/Core/TempAllocator.h>
#include <Jolt/Physics/Body/BodyCreationSettings.h>
#include <Jolt/Physics/Collision/CastResult.h>
#include <Jolt/Physics/Collision/RayCast.h>
#include <Jolt/Physics/Collision/Shape/BoxShape.h>
#include <Jolt/Physics/Collision/Shape/HeightFieldShape.h>
#include <Jolt/Physics/PhysicsSystem.h>
#include <Jolt/RegisterTypes.h>
#include <cmath>
#include <map>
#include "g1/physique.hpp"

namespace g1 {
namespace {
namespace Couche { constexpr JPH::ObjectLayer STATIQUE = 0; }
struct BPCouches final : JPH::BroadPhaseLayerInterface {
  JPH::uint GetNumBroadPhaseLayers() const override { return 1; }
  JPH::BroadPhaseLayer GetBroadPhaseLayer(JPH::ObjectLayer) const override { return JPH::BroadPhaseLayer(0); }
#if defined(JPH_EXTERNAL_PROFILE) || defined(JPH_PROFILE_ENABLED)
  const char* GetBroadPhaseLayerName(JPH::BroadPhaseLayer) const override { return "statique"; }
#endif
};
struct FiltreOBP final : JPH::ObjectVsBroadPhaseLayerFilter { bool ShouldCollide(JPH::ObjectLayer, JPH::BroadPhaseLayer) const override { return true; } };
struct FiltreOO final : JPH::ObjectLayerPairFilter { bool ShouldCollide(JPH::ObjectLayer, JPH::ObjectLayer) const override { return true; } };

class JoltWorld final : public IPhysicsWorld {
 public:
  const char* nom() const override { return "jolt"; }
  void init() override {
    static bool global = false;
    if (!global) { JPH::RegisterDefaultAllocator(); JPH::Factory::sInstance = new JPH::Factory(); JPH::RegisterTypes(); global = true; }
    temp_ = std::make_unique<JPH::TempAllocatorImpl>(8 * 1024 * 1024);
    sys_.Init(65536, 0, 65536, 16384, bp_, obp_, oo_);
  }
  void step(float) override {}   // corps statiques uniquement (les projectiles restent dans la balistique du cœur)
  void set_heightfield(const float* h, uint32_t w, uint32_t hg, float scale) override {
    JPH::BodyInterface& bi = sys_.GetBodyInterface();
    if (!terrain_.IsInvalid()) { bi.RemoveBody(terrain_); bi.DestroyBody(terrain_); }
    // Jolt veut un heightfield carré dont le nombre d'échantillons est multiple de la taille de bloc : on complète en
    // répétant le bord (la zone ajoutée est hors du monde)
    uint32_t n = std::max(w, hg), bloc = 4, c = ((n + bloc - 1) / bloc) * bloc; std::vector<float> s(size_t(c) * c);
    for (uint32_t j = 0; j < c; ++j) for (uint32_t i = 0; i < c; ++i) s[size_t(j) * c + i] = h[size_t(std::min(j, hg - 1)) * w + std::min(i, w - 1)];
    JPH::HeightFieldShapeSettings hs(s.data(), JPH::Vec3(-(w - 1) * scale * 0.5f, 0, -(hg - 1) * scale * 0.5f), JPH::Vec3(scale, 1, scale), c);
    hs.mBlockSize = bloc;
    auto r = hs.Create(); if (r.HasError()) return;
    terrain_ = bi.CreateAndAddBody(JPH::BodyCreationSettings(r.Get(), JPH::RVec3::sZero(), JPH::Quat::sIdentity(), JPH::EMotionType::Static, Couche::STATIQUE), JPH::EActivation::DontActivate);
    sys_.OptimizeBroadPhase();
  }
  void set_boites(const std::vector<Boite>& b) override {
    JPH::BodyInterface& bi = sys_.GetBodyInterface();
    for (auto& [id, corps] : boites_) { bi.RemoveBody(corps); bi.DestroyBody(corps); }
    boites_.clear(); ids_.clear();
    for (size_t i = 0; i < b.size(); ++i) ajouter(int(i), b[i]);
    sys_.OptimizeBroadPhase();
  }
  void maj_boite(int id, const Boite& b) override {
    JPH::BodyInterface& bi = sys_.GetBodyInterface(); auto it = boites_.find(id);
    if (it != boites_.end()) { ids_.erase(it->second.GetIndexAndSequenceNumber()); bi.RemoveBody(it->second); bi.DestroyBody(it->second); boites_.erase(it); }
    ajouter(id, b);
  }
  bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float& d) override { int b; return raycast(ox, oy, oz, dx, dy, dz, 1e5f, d, b); }
  bool raycast(float ox, float oy, float oz, float dx, float dy, float dz, float maxDist, float& dist, int& boite) override {
    float L = std::sqrt(dx * dx + dy * dy + dz * dz); if (L < 1e-9f) return false;
    JPH::RRayCast ray{JPH::RVec3(ox, oy, oz), JPH::Vec3(dx, dy, dz) * (maxDist / L)}; JPH::RayCastResult res;
    if (!sys_.GetNarrowPhaseQuery().CastRay(ray, res)) return false;
    dist = res.mFraction * maxDist; auto it = ids_.find(res.mBodyID.GetIndexAndSequenceNumber()); boite = it == ids_.end() ? -1 : it->second;
    return true;
  }
 private:
  void ajouter(int id, const Boite& b) {
    if (!b.active) return;
    JPH::BodyCreationSettings bc(new JPH::BoxShape(JPH::Vec3(b.hx, b.hy, b.hz), 0.f), JPH::RVec3(b.cx, b.cy, b.cz),
                                 JPH::Quat::sRotation(JPH::Vec3::sAxisY(), b.lacet), JPH::EMotionType::Static, Couche::STATIQUE);   // même sens que le lacet du cœur (axe local x → (cos, 0, −sin))
    JPH::BodyID corps = sys_.GetBodyInterface().CreateAndAddBody(bc, JPH::EActivation::DontActivate);
    boites_[id] = corps; ids_[corps.GetIndexAndSequenceNumber()] = id;
  }
  BPCouches bp_; FiltreOBP obp_; FiltreOO oo_; JPH::PhysicsSystem sys_; std::unique_ptr<JPH::TempAllocatorImpl> temp_;
  JPH::BodyID terrain_; std::map<int, JPH::BodyID> boites_; std::map<JPH::uint32, int> ids_;
};
}  // namespace
std::unique_ptr<IPhysicsWorld> creerPhysiqueJolt() { return std::make_unique<JoltWorld>(); }
}  // namespace g1
#endif
