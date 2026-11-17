// Brique 3 du document d'architecture r88 : gestionnaire d'état Headless / Jeu / Éditeur.
//   HeadlessSimulation : aucune fenêtre ni contexte graphique (serveur, intégration continue, équilibrage) ;
//   InteractiveGame    : jeu complet avec rendu bgfx ;
//   Editor             : sculpture du terrain au pinceau, sans contraintes de jeu (mode développement du cœur).
#pragma once

enum class EngineMode { HeadlessSimulation, InteractiveGame, Editor };

class AppStateManager {
 public:
  static AppStateManager& instance() { static AppStateManager inst; return inst; }
  void set_mode(EngineMode m) { m_current_mode = m; }
  [[nodiscard]] EngineMode mode() const { return m_current_mode; }
  [[nodiscard]] bool is_headless() const { return m_current_mode == EngineMode::HeadlessSimulation; }
 private:
  EngineMode m_current_mode = EngineMode::InteractiveGame;
};
