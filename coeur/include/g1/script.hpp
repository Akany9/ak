// Scripting Lua des scénarios historiques (document d'architecture r88, brique 4 : « Lua Bindings, sol2 »).
// Le script pilote la machine à états narrative et la chronologie ; il n'a accès qu'au module `r88` (aucun fichier,
// aucune horloge : io et os sont vides, math.random est remplacé par le générateur déterministe du cœur).
// Hooks optionnels appelés par le cœur : on_scenario_init(), on_hour(h), on_event(type, json).
#pragma once
#include <memory>
#include <string>

namespace g1 {
class Monde;
class Script {
 public:
  explicit Script(Monde& m);
  ~Script();
  bool charger(const std::string& source, const std::string& nom, std::string& erreur);   // exécute le fichier puis on_scenario_init()
  void heure(int h);
  void evenement(const std::string& type, const std::string& json);
  bool actif() const;
 private:
  struct Impl; std::unique_ptr<Impl> p_;
};
}  // namespace g1
