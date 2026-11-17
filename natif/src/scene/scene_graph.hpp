// Brique 1 du document d'architecture r88 (« Option A — Lean ») : SceneGraph instancié sécurisé.
// Poignées générationnelles (index + génération) : une poignée vers un nœud détruit puis réutilisé est refusée.
// Stockage linéaire (cache) : le rendu parcourt raw_nodes() sans indirection.
#pragma once
#include <algorithm>
#include <array>
#include <cstdint>
#include <iterator>
#include <vector>

struct Handle { uint32_t index = 0, generation = 0; };
struct AABB { std::array<float, 3> min{}, max{}; };
struct SceneNode { float transform[16]; AABB world_bounds; uint32_t generation = 0; bool alive = false; uint32_t user = 0; };

class SceneGraph {
 public:
  Handle create_node() {
    uint32_t index;
    if (!m_free_indices.empty()) { index = m_free_indices.back(); m_free_indices.pop_back(); }
    else { index = static_cast<uint32_t>(m_nodes.size()); m_nodes.emplace_back(); m_generations.push_back(0); }
    SceneNode& n = m_nodes[index]; n.alive = true; n.generation = m_generations[index];
    std::fill(std::begin(n.transform), std::end(n.transform), 0.0f); n.transform[0] = n.transform[5] = n.transform[10] = n.transform[15] = 1.0f;
    return Handle{index, m_generations[index]};
  }
  void destroy_node(Handle h) {
    if (!is_valid(h)) return;
    m_nodes[h.index].alive = false; m_generations[h.index]++; m_free_indices.push_back(h.index);
  }
  [[nodiscard]] bool is_valid(Handle h) const { return h.index < m_nodes.size() && m_nodes[h.index].alive && m_generations[h.index] == h.generation; }
  SceneNode* get(Handle h) { return is_valid(h) ? &m_nodes[h.index] : nullptr; }
  const std::vector<SceneNode>& raw_nodes() const { return m_nodes; }
  void clear() { m_nodes.clear(); m_generations.clear(); m_free_indices.clear(); }
 private:
  std::vector<SceneNode> m_nodes; std::vector<uint32_t> m_generations, m_free_indices;
};
